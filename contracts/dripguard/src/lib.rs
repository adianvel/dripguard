#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, Vec,
};

#[cfg(test)]
mod test;

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
    Unauthorized = 7,
    InvalidAmount = 8,
    VaultAlreadyExists = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultInfo {
    pub admin: Address,
    pub agent: Address,
    pub token: Address,
    pub total_deposited: i128,
    pub claimed: i128,
    pub start_time: u64,
    pub cliff_seconds: u64,
    pub release_rate_per_sec: i128,
    pub max_per_call: i128,
    pub allowlist: Vec<Address>,
    pub paused: bool,
    /// Sliding window length for velocity checks (seconds).
    pub velocity_window_seconds: u64,
    /// Max total drawdown allowed inside the current window. 0 = disabled.
    pub velocity_max: i128,
    /// Start of the active velocity window.
    pub window_start: u64,
    /// Amount already drawn in the active velocity window.
    pub window_spent: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// agent address -> VaultInfo
    Vault(Address),
    /// admin address -> agents with vaults
    AdminVaults(Address),
}

#[contract]
pub struct DripGuard;

#[contractimpl]
impl DripGuard {
    /// Fund a new vault for `agent`. Pulls `amount` of `token` from `admin` into the contract.
    ///
    /// `velocity_max` is the max total spend allowed per `velocity_window_seconds`.
    /// Pass `velocity_max = 0` to disable the circuit breaker.
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
        velocity_window_seconds: u64,
        velocity_max: i128,
    ) {
        admin.require_auth();
        if amount <= 0 || release_rate_per_sec <= 0 || max_per_call <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if velocity_max < 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if velocity_max > 0 && velocity_window_seconds == 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let vault_key = DataKey::Vault(agent.clone());
        if env.storage().persistent().has(&vault_key) {
            panic_with_error!(&env, Error::VaultAlreadyExists);
        }

        token::Client::new(&env, &token).transfer(
            &admin,
            &env.current_contract_address(),
            &amount,
        );

        let now = env.ledger().timestamp();
        let vault = VaultInfo {
            admin: admin.clone(),
            agent: agent.clone(),
            token,
            total_deposited: amount,
            claimed: 0,
            start_time: now,
            cliff_seconds,
            release_rate_per_sec,
            max_per_call,
            allowlist,
            paused: false,
            velocity_window_seconds,
            velocity_max,
            window_start: now,
            window_spent: 0,
        };

        env.storage().persistent().set(&vault_key, &vault);
        Self::track_admin_vault(&env, &admin, &agent);

        env.events().publish(
            (symbol_short!("create"), agent.clone()),
            (admin, amount),
        );
    }

    pub fn vested_amount(env: Env, agent: Address) -> i128 {
        let vault = Self::load_vault(&env, &agent);
        Self::compute_vested(&env, &vault)
    }

    pub fn claimable_amount(env: Env, agent: Address) -> i128 {
        let vault = Self::load_vault(&env, &agent);
        let unlocked = Self::compute_vested(&env, &vault);
        unlocked - vault.claimed
    }

    pub fn get_vault(env: Env, agent: Address) -> VaultInfo {
        Self::load_vault(&env, &agent)
    }

    pub fn list_vaults(env: Env, admin: Address) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::AdminVaults(admin))
            .unwrap_or(Vec::new(&env))
    }

    /// Agent pays an allowlisted payee from vested, unclaimed balance.
    /// Enforces velocity window: if spend in the window would exceed `velocity_max`,
    /// the vault is auto-paused (no transfer). Subsequent calls fail with `VaultPaused`.
    pub fn drawdown(env: Env, agent: Address, payee: Address, amount: i128) {
        agent.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let mut vault = Self::load_vault(&env, &agent);

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

        // Velocity circuit breaker.
        // Note: panicking rolls back storage, so a trip must succeed as a pause-only tx
        // (no transfer) for the auto-pause to persist.
        if vault.velocity_max > 0 {
            let now = env.ledger().timestamp();
            if now.saturating_sub(vault.window_start) >= vault.velocity_window_seconds {
                vault.window_start = now;
                vault.window_spent = 0;
            }
            if vault.window_spent.saturating_add(amount) > vault.velocity_max {
                vault.paused = true;
                env.storage()
                    .persistent()
                    .set(&DataKey::Vault(agent.clone()), &vault);
                env.events().publish(
                    (symbol_short!("vel_trip"), agent.clone()),
                    (vault.window_spent, amount, vault.velocity_max),
                );
                // Commit pause without paying; subsequent drawdowns hit VaultPaused.
                return;
            }
            vault.window_spent = vault.window_spent.saturating_add(amount);
        }

        vault.claimed += amount;
        env.storage()
            .persistent()
            .set(&DataKey::Vault(agent.clone()), &vault);

        token::Client::new(&env, &vault.token).transfer(
            &env.current_contract_address(),
            &payee,
            &amount,
        );

        env.events()
            .publish((symbol_short!("drawdown"), agent), (payee, amount));
    }

    pub fn pause(env: Env, admin: Address, agent: Address) {
        admin.require_auth();
        let mut vault = Self::load_vault(&env, &agent);

        if admin != vault.admin {
            panic_with_error!(&env, Error::Unauthorized);
        }

        vault.paused = true;
        env.storage()
            .persistent()
            .set(&DataKey::Vault(agent.clone()), &vault);

        env.events()
            .publish((symbol_short!("pause"), agent), admin);
    }

    pub fn unpause(env: Env, admin: Address, agent: Address) {
        admin.require_auth();
        let mut vault = Self::load_vault(&env, &agent);

        if admin != vault.admin {
            panic_with_error!(&env, Error::Unauthorized);
        }

        vault.paused = false;
        // Reset velocity window on manual unpause so agent gets a clean window.
        vault.window_start = env.ledger().timestamp();
        vault.window_spent = 0;
        env.storage()
            .persistent()
            .set(&DataKey::Vault(agent.clone()), &vault);

        env.events()
            .publish((symbol_short!("unpause"), agent), admin);
    }

    pub fn revoke(env: Env, admin: Address, agent: Address) -> i128 {
        admin.require_auth();
        let vault = Self::load_vault(&env, &agent);

        if admin != vault.admin {
            panic_with_error!(&env, Error::Unauthorized);
        }

        let remaining = vault.total_deposited - vault.claimed;
        env.storage()
            .persistent()
            .remove(&DataKey::Vault(agent.clone()));
        Self::untrack_admin_vault(&env, &admin, &agent);

        if remaining > 0 {
            token::Client::new(&env, &vault.token).transfer(
                &env.current_contract_address(),
                &admin,
                &remaining,
            );
        }

        env.events()
            .publish((symbol_short!("revoke"), agent), (admin, remaining));

        remaining
    }

    fn load_vault(env: &Env, agent: &Address) -> VaultInfo {
        env.storage()
            .persistent()
            .get(&DataKey::Vault(agent.clone()))
            .unwrap_or_else(|| panic_with_error!(env, Error::VaultNotFound))
    }

    fn track_admin_vault(env: &Env, admin: &Address, agent: &Address) {
        let key = DataKey::AdminVaults(admin.clone());
        let mut agents: Vec<Address> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));
        if !agents.contains(agent) {
            agents.push_back(agent.clone());
            env.storage().persistent().set(&key, &agents);
        }
    }

    fn untrack_admin_vault(env: &Env, admin: &Address, agent: &Address) {
        let key = DataKey::AdminVaults(admin.clone());
        let agents: Vec<Address> = match env.storage().persistent().get(&key) {
            Some(v) => v,
            None => return,
        };
        let mut next = Vec::new(env);
        for a in agents.iter() {
            if a != *agent {
                next.push_back(a);
            }
        }
        env.storage().persistent().set(&key, &next);
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
