import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions } from "@stellar/stellar-sdk/contract";
import type { u64, i128 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML";
    };
};
export declare const Errors: {
    1: {
        message: string;
    };
    2: {
        message: string;
    };
    3: {
        message: string;
    };
    4: {
        message: string;
    };
    5: {
        message: string;
    };
    6: {
        message: string;
    };
    7: {
        message: string;
    };
    8: {
        message: string;
    };
    9: {
        message: string;
    };
};
export type DataKey = {
    tag: "Vault";
    values: readonly [string];
} | {
    tag: "AdminVaults";
    values: readonly [string];
};
export interface VaultInfo {
    admin: string;
    agent: string;
    allowlist: Array<string>;
    claimed: i128;
    cliff_seconds: u64;
    max_per_call: i128;
    paused: boolean;
    release_rate_per_sec: i128;
    start_time: u64;
    token: string;
    total_deposited: i128;
    /**
   * Max total drawdown allowed inside the current window. 0 = disabled.
   */
    velocity_max: i128;
    /**
   * Sliding window length for velocity checks (seconds).
   */
    velocity_window_seconds: u64;
    /**
   * Amount already drawn in the active velocity window.
   */
    window_spent: i128;
    /**
   * Start of the active velocity window.
   */
    window_start: u64;
}
export interface Client {
    /**
     * Construct and simulate a pause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    pause: ({ admin, agent }: {
        admin: string;
        agent: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a revoke transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    revoke: ({ admin, agent }: {
        admin: string;
        agent: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a unpause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    unpause: ({ admin, agent }: {
        admin: string;
        agent: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a drawdown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Agent pays an allowlisted payee from vested, unclaimed balance.
     * Enforces velocity window: if spend in the window would exceed `velocity_max`,
     * the vault is auto-paused and the call reverts with `VelocityExceeded`.
     */
    drawdown: ({ agent, payee, amount }: {
        agent: string;
        payee: string;
        amount: i128;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a get_vault transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_vault: ({ agent }: {
        agent: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<VaultInfo>>;
    /**
     * Construct and simulate a list_vaults transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    list_vaults: ({ admin }: {
        admin: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>;
    /**
     * Construct and simulate a create_vault transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Fund a new vault for `agent`. Pulls `amount` of `token` from `admin` into the contract.
     *
     * `velocity_max` is the max total spend allowed per `velocity_window_seconds`.
     * Pass `velocity_max = 0` to disable the circuit breaker.
     */
    create_vault: ({ admin, agent, token, amount, cliff_seconds, release_rate_per_sec, max_per_call, allowlist, velocity_window_seconds, velocity_max }: {
        admin: string;
        agent: string;
        token: string;
        amount: i128;
        cliff_seconds: u64;
        release_rate_per_sec: i128;
        max_per_call: i128;
        allowlist: Array<string>;
        velocity_window_seconds: u64;
        velocity_max: i128;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a vested_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    vested_amount: ({ agent }: {
        agent: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a claimable_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    claimable_amount: ({ agent }: {
        agent: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        pause: (json: string) => AssembledTransaction<null>;
        revoke: (json: string) => AssembledTransaction<bigint>;
        unpause: (json: string) => AssembledTransaction<null>;
        drawdown: (json: string) => AssembledTransaction<null>;
        get_vault: (json: string) => AssembledTransaction<VaultInfo>;
        list_vaults: (json: string) => AssembledTransaction<string[]>;
        create_vault: (json: string) => AssembledTransaction<null>;
        vested_amount: (json: string) => AssembledTransaction<bigint>;
        claimable_amount: (json: string) => AssembledTransaction<bigint>;
    };
}
