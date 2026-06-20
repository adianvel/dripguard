#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec, panic_with_error, contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    VaultPaused = 1,
    PayeeNotAllowed = 2,
    ExceedsPerCallCap = 3,
    ExceedsVestedBalance = 4,
    VelocityExceeded = 5,
    VaultNotFound = 6,
}

#[contracttype]
#[derive(Clone)]
pub struct VaultInfo {
    pub admin: Address,
    pub token: Address,
    pub total_deposited: i128,
    pub claimed: i128,
    pub start_time: u64,
    pub cliff_seconds: u64,
    pub release_rate_per_sec: i128,
    pub max_per_call: i128,
    pub allowlist: Vec<Address>,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Vault(Address), // agent address -> VaultInfo
}

#[contract]
pub struct DripGuard;

#[contractimpl]
impl DripGuard {
    pub fn create_vault(
        env: Env,
        admin: Address,
        agent: Address,
        token: Address,
        amount: i128,
        cliff_seconds: u64,
        release_rate_per_sec: i128,
        max_per_call: i128,
        allowlist: Vec<Address>,
    ) {
        admin.require_auth();

        let vault = VaultInfo {
            admin,
            token,
            total_deposited: amount,
            claimed: 0,
            start_time: env.ledger().timestamp(),
            cliff_seconds,
            release_rate_per_sec,
            max_per_call,
            allowlist,
            paused: false,
        };

        env.storage().instance().set(&DataKey::Vault(agent), &vault);
    }

    pub fn vested_amount(env: Env, agent: Address) -> i128 {
        let vault: VaultInfo = env
            .storage()
            .instance()
            .get(&DataKey::Vault(agent))
            .unwrap_or_else(|| panic_with_error!(&env, Error::VaultNotFound));

        Self::compute_vested(&env, &vault)
    }

    pub fn drawdown(env: Env, agent: Address, payee: Address, amount: i128) {
        agent.require_auth();

        let mut vault: VaultInfo = env
            .storage()
            .instance()
            .get(&DataKey::Vault(agent.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::VaultNotFound));

        if vault.paused {
            panic_with_error!(&env, Error::VaultPaused);
        }
        if !vault.allowlist.contains(&payee) {
            panic_with_error!(&env, Error::PayeeNotAllowed);
        }
        if amount > vault.max_per_call {
            panic_with_error!(&env, Error::ExceedsPerCallCap);
        }

        let unlocked = Self::compute_vested(&env, &vault);
        let claimable = unlocked - vault.claimed;
        if amount > claimable {
            panic_with_error!(&env, Error::ExceedsVestedBalance);
        }

        vault.claimed += amount;
        env.storage().instance().set(&DataKey::Vault(agent), &vault);

        // NOTE: token transfer call goes here once we wire up the token client
        // let token_client = token::Client::new(&env, &vault.token);
        // token_client.transfer(&env.current_contract_address(), &payee, &amount);
    }

    pub fn pause(env: Env, admin: Address, agent: Address) {
        admin.require_auth();
        let mut vault: VaultInfo = env
            .storage()
            .instance()
            .get(&DataKey::Vault(agent.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::VaultNotFound));

        vault.paused = true;
        env.storage().instance().set(&DataKey::Vault(agent), &vault);
    }

    pub fn revoke(env: Env, admin: Address, agent: Address) -> i128 {
        admin.require_auth();
        let vault: VaultInfo = env
            .storage()
            .instance()
            .get(&DataKey::Vault(agent.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::VaultNotFound));

        let remaining = vault.total_deposited - vault.claimed;
        env.storage().instance().remove(&DataKey::Vault(agent));

        // NOTE: transfer `remaining` back to admin via token client here

        remaining
    }

    fn compute_vested(env: &Env, vault: &VaultInfo) -> i128 {
        let now = env.ledger().timestamp();
        let elapsed = now.saturating_sub(vault.start_time);

        if elapsed < vault.cliff_seconds {
            return 0;
        }

        let vested = (elapsed as i128) * vault.release_rate_per_sec;
        vested.min(vault.total_deposited)
    }
}