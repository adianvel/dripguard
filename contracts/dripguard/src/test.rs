extern crate std;

use crate::{DripGuard, DripGuardClient, Error};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    vec, Address, Env, Error as SdkError, Vec,
};
use std::boxed::Box;

const DEPOSIT: i128 = 1_000;

struct Fixture {
    env: Env,
    client: DripGuardClient<'static>,
    admin: Address,
    agent: Address,
    token_addr: Address,
    payee: Address,
    other: Address,
    token: TokenClient<'static>,
}

fn fixture() -> Fixture {
    let env = Box::leak(Box::new(Env::default()));
    env.mock_all_auths();

    let admin = Address::generate(env);
    let agent = Address::generate(env);
    let payee = Address::generate(env);
    let other = Address::generate(env);

    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = token_contract.address();
    let token_admin = StellarAssetClient::new(env, &token_addr);
    let token = TokenClient::new(env, &token_addr);
    token_admin.mint(&admin, &(DEPOSIT * 10));

    let contract_id = env.register_contract(None, DripGuard);
    let client = DripGuardClient::new(env, &contract_id);

    Fixture {
        env: env.clone(),
        client,
        admin,
        agent,
        token_addr,
        payee,
        other,
        token,
    }
}

fn create_vault(f: &Fixture, allowlist: Vec<Address>) {
    create_vault_with_velocity(f, allowlist, 0, 0);
}

fn create_vault_with_velocity(
    f: &Fixture,
    allowlist: Vec<Address>,
    window_secs: u64,
    velocity_max: i128,
) {
    f.client.create_vault(
        &f.admin,
        &f.agent,
        &f.token_addr,
        &DEPOSIT,
        &5,
        &10,
        &100,
        &allowlist,
        &window_secs,
        &velocity_max,
    );
}

fn contract_error(error: Error) -> SdkError {
    SdkError::from_contract_error(error as u32)
}

#[test]
fn create_vault_pulls_tokens_into_contract() {
    let f = fixture();
    let contract = f.client.address.clone();

    assert_eq!(f.token.balance(&f.admin), DEPOSIT * 10);
    assert_eq!(f.token.balance(&contract), 0);

    create_vault(&f, vec![&f.env, f.payee.clone()]);

    assert_eq!(f.token.balance(&f.admin), DEPOSIT * 9);
    assert_eq!(f.token.balance(&contract), DEPOSIT);

    let vault = f.client.get_vault(&f.agent);
    assert_eq!(vault.total_deposited, DEPOSIT);
    assert_eq!(vault.claimed, 0);
    assert_eq!(vault.admin, f.admin);
    assert_eq!(vault.agent, f.agent);
    assert_eq!(vault.velocity_max, 0);

    let listed = f.client.list_vaults(&f.admin);
    assert_eq!(listed.len(), 1);
    assert_eq!(listed.get(0).unwrap(), f.agent);
}

#[test]
fn create_vault_rejects_duplicate_agent() {
    let f = fixture();
    let allowlist = vec![&f.env, f.payee.clone()];
    create_vault(&f, allowlist.clone());

    assert_eq!(
        f.client.try_create_vault(
            &f.admin,
            &f.agent,
            &f.token_addr,
            &DEPOSIT,
            &0,
            &10,
            &100,
            &allowlist,
            &0,
            &0
        ),
        Err(Ok(contract_error(Error::VaultAlreadyExists)))
    );
}

#[test]
fn vested_amount_respects_cliff_rate_and_total_budget() {
    let f = fixture();
    f.env.ledger().set_timestamp(1_000);
    create_vault(&f, vec![&f.env, f.payee.clone()]);

    f.env.ledger().set_timestamp(1_004);
    assert_eq!(f.client.vested_amount(&f.agent), 0);
    assert_eq!(f.client.claimable_amount(&f.agent), 0);

    f.env.ledger().set_timestamp(1_005);
    assert_eq!(f.client.vested_amount(&f.agent), 50);
    assert_eq!(f.client.claimable_amount(&f.agent), 50);

    f.env.ledger().set_timestamp(1_250);
    assert_eq!(f.client.vested_amount(&f.agent), DEPOSIT);
    assert_eq!(f.client.claimable_amount(&f.agent), DEPOSIT);
}

#[test]
fn drawdown_transfers_tokens_and_enforces_rules() {
    let f = fixture();
    f.env.ledger().set_timestamp(10);
    create_vault(&f, vec![&f.env, f.payee.clone()]);

    f.env.ledger().set_timestamp(16);

    assert_eq!(
        f.client.try_drawdown(&f.agent, &f.other, &10),
        Err(Ok(contract_error(Error::PayeeNotAllowed)))
    );
    assert_eq!(
        f.client.try_drawdown(&f.agent, &f.payee, &101),
        Err(Ok(contract_error(Error::ExceedsPerCallCap)))
    );
    assert_eq!(
        f.client.try_drawdown(&f.agent, &f.payee, &61),
        Err(Ok(contract_error(Error::ExceedsVestedBalance)))
    );

    f.client.drawdown(&f.agent, &f.payee, &50);
    assert_eq!(f.token.balance(&f.payee), 50);
    assert_eq!(f.token.balance(&f.client.address), DEPOSIT - 50);
    assert_eq!(f.client.claimable_amount(&f.agent), 10);

    assert_eq!(
        f.client.try_drawdown(&f.agent, &f.payee, &11),
        Err(Ok(contract_error(Error::ExceedsVestedBalance)))
    );
}

#[test]
fn velocity_breaker_auto_pauses_on_spike() {
    let f = fixture();
    f.env.ledger().set_timestamp(100);
    // window 60s, max 80 total spend, per-call 100
    create_vault_with_velocity(&f, vec![&f.env, f.payee.clone()], 60, 80);

    f.env.ledger().set_timestamp(110); // vested = 100
    f.client.drawdown(&f.agent, &f.payee, &50);
    assert_eq!(f.client.get_vault(&f.agent).window_spent, 50);
    assert_eq!(f.token.balance(&f.payee), 50);

    // 50 + 40 = 90 > 80 → auto-pause, no transfer (Soroban cannot commit+panic)
    f.client.drawdown(&f.agent, &f.payee, &40);
    let vault = f.client.get_vault(&f.agent);
    assert!(vault.paused);
    assert_eq!(vault.window_spent, 50); // tripped amount not counted
    assert_eq!(f.token.balance(&f.payee), 50); // no payment on trip

    // Still paused
    assert_eq!(
        f.client.try_drawdown(&f.agent, &f.payee, &1),
        Err(Ok(contract_error(Error::VaultPaused)))
    );

    f.client.unpause(&f.admin, &f.agent);
    let vault = f.client.get_vault(&f.agent);
    assert!(!vault.paused);
    assert_eq!(vault.window_spent, 0);
}

#[test]
fn velocity_window_resets_after_expiry() {
    let f = fixture();
    f.env.ledger().set_timestamp(100);
    create_vault_with_velocity(&f, vec![&f.env, f.payee.clone()], 60, 80);

    f.env.ledger().set_timestamp(110);
    f.client.drawdown(&f.agent, &f.payee, &70);
    assert_eq!(f.client.get_vault(&f.agent).window_spent, 70);

    // After window elapses, spend counter resets
    f.env.ledger().set_timestamp(170);
    f.client.drawdown(&f.agent, &f.payee, &70);
    assert_eq!(f.client.get_vault(&f.agent).window_spent, 70);
    assert_eq!(f.token.balance(&f.payee), 140);
}

#[test]
fn pause_and_revoke_are_admin_only_and_refund() {
    let f = fixture();
    f.env.ledger().set_timestamp(100);
    create_vault(&f, vec![&f.env, f.payee.clone()]);

    let admin_before = f.token.balance(&f.admin);

    assert_eq!(
        f.client.try_pause(&f.other, &f.agent),
        Err(Ok(contract_error(Error::Unauthorized)))
    );
    assert_eq!(
        f.client.try_revoke(&f.other, &f.agent),
        Err(Ok(contract_error(Error::Unauthorized)))
    );

    f.env.ledger().set_timestamp(115);
    f.client.drawdown(&f.agent, &f.payee, &100);
    f.client.pause(&f.admin, &f.agent);

    assert_eq!(
        f.client.try_drawdown(&f.agent, &f.payee, &1),
        Err(Ok(contract_error(Error::VaultPaused)))
    );

    f.client.unpause(&f.admin, &f.agent);
    assert_eq!(f.client.claimable_amount(&f.agent), 50);
    f.client.pause(&f.admin, &f.agent);

    let refunded = f.client.revoke(&f.admin, &f.agent);
    assert_eq!(refunded, 900);
    assert_eq!(f.token.balance(&f.admin), admin_before + 900);
    assert_eq!(f.token.balance(&f.client.address), 0);
    assert_eq!(
        f.client.try_vested_amount(&f.agent),
        Err(Ok(contract_error(Error::VaultNotFound)))
    );
    assert_eq!(f.client.list_vaults(&f.admin).len(), 0);
}

#[test]
fn rejects_non_positive_amounts() {
    let f = fixture();
    f.env.ledger().set_timestamp(1);
    let allowlist = vec![&f.env, f.payee.clone()];

    assert_eq!(
        f.client.try_create_vault(
            &f.admin,
            &f.agent,
            &f.token_addr,
            &0,
            &0,
            &10,
            &100,
            &allowlist,
            &0,
            &0
        ),
        Err(Ok(contract_error(Error::InvalidAmount)))
    );

    create_vault(&f, allowlist);
    f.env.ledger().set_timestamp(10);

    assert_eq!(
        f.client.try_drawdown(&f.agent, &f.payee, &0),
        Err(Ok(contract_error(Error::InvalidAmount)))
    );
}
