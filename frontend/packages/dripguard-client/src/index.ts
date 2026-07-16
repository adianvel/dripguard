import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML",
  }
} as const

export const Errors = {
  1: {message:"VaultPaused"},
  2: {message:"PayeeNotAllowed"},
  3: {message:"ExceedsPerCallCap"},
  4: {message:"ExceedsVestedBalance"},
  5: {message:"VelocityExceeded"},
  6: {message:"VaultNotFound"},
  7: {message:"Unauthorized"},
  8: {message:"InvalidAmount"},
  9: {message:"VaultAlreadyExists"}
}

export type DataKey = {tag: "Vault", values: readonly [string]} | {tag: "AdminVaults", values: readonly [string]};


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
  pause: ({admin, agent}: {admin: string, agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a revoke transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revoke: ({admin, agent}: {admin: string, agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a unpause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unpause: ({admin, agent}: {admin: string, agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a drawdown transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Agent pays an allowlisted payee from vested, unclaimed balance.
   * Enforces velocity window: if spend in the window would exceed `velocity_max`,
   * the vault is auto-paused and the call reverts with `VelocityExceeded`.
   */
  drawdown: ({agent, payee, amount}: {agent: string, payee: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_vault transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_vault: ({agent}: {agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<VaultInfo>>

  /**
   * Construct and simulate a list_vaults transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  list_vaults: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a create_vault transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Fund a new vault for `agent`. Pulls `amount` of `token` from `admin` into the contract.
   * 
   * `velocity_max` is the max total spend allowed per `velocity_window_seconds`.
   * Pass `velocity_max = 0` to disable the circuit breaker.
   */
  create_vault: ({admin, agent, token, amount, cliff_seconds, release_rate_per_sec, max_per_call, allowlist, velocity_window_seconds, velocity_max}: {admin: string, agent: string, token: string, amount: i128, cliff_seconds: u64, release_rate_per_sec: i128, max_per_call: i128, allowlist: Array<string>, velocity_window_seconds: u64, velocity_max: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a vested_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  vested_amount: ({agent}: {agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a claimable_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claimable_amount: ({agent}: {agent: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAFcGF1c2UAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABWFnZW50AAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAGcmV2b2tlAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABWFnZW50AAAAAAAAEwAAAAEAAAAL",
        "AAAAAAAAAAAAAAAHdW5wYXVzZQAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABWFnZW50AAAAAAAAEwAAAAA=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAAAAAAAALVmF1bHRQYXVzZWQAAAAAAQAAAAAAAAAPUGF5ZWVOb3RBbGxvd2VkAAAAAAIAAAAAAAAAEUV4Y2VlZHNQZXJDYWxsQ2FwAAAAAAAAAwAAAAAAAAAURXhjZWVkc1Zlc3RlZEJhbGFuY2UAAAAEAAAAAAAAABBWZWxvY2l0eUV4Y2VlZGVkAAAABQAAAAAAAAANVmF1bHROb3RGb3VuZAAAAAAAAAYAAAAAAAAADFVuYXV0aG9yaXplZAAAAAcAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAIAAAAAAAAABJWYXVsdEFscmVhZHlFeGlzdHMAAAAAAAk=",
        "AAAAAAAAANRBZ2VudCBwYXlzIGFuIGFsbG93bGlzdGVkIHBheWVlIGZyb20gdmVzdGVkLCB1bmNsYWltZWQgYmFsYW5jZS4KRW5mb3JjZXMgdmVsb2NpdHkgd2luZG93OiBpZiBzcGVuZCBpbiB0aGUgd2luZG93IHdvdWxkIGV4Y2VlZCBgdmVsb2NpdHlfbWF4YCwKdGhlIHZhdWx0IGlzIGF1dG8tcGF1c2VkIGFuZCB0aGUgY2FsbCByZXZlcnRzIHdpdGggYFZlbG9jaXR5RXhjZWVkZWRgLgAAAAhkcmF3ZG93bgAAAAMAAAAAAAAABWFnZW50AAAAAAAAEwAAAAAAAAAFcGF5ZWUAAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAJZ2V0X3ZhdWx0AAAAAAAAAQAAAAAAAAAFYWdlbnQAAAAAAAATAAAAAQAAB9AAAAAJVmF1bHRJbmZvAAAA",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAgAAAAEAAAAaYWdlbnQgYWRkcmVzcyAtPiBWYXVsdEluZm8AAAAAAAVWYXVsdAAAAAAAAAEAAAATAAAAAQAAACNhZG1pbiBhZGRyZXNzIC0+IGFnZW50cyB3aXRoIHZhdWx0cwAAAAALQWRtaW5WYXVsdHMAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAALbGlzdF92YXVsdHMAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAA+oAAAAT",
        "AAAAAQAAAAAAAAAAAAAACVZhdWx0SW5mbwAAAAAAAA8AAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFYWdlbnQAAAAAAAATAAAAAAAAAAlhbGxvd2xpc3QAAAAAAAPqAAAAEwAAAAAAAAAHY2xhaW1lZAAAAAALAAAAAAAAAA1jbGlmZl9zZWNvbmRzAAAAAAAABgAAAAAAAAAMbWF4X3Blcl9jYWxsAAAACwAAAAAAAAAGcGF1c2VkAAAAAAABAAAAAAAAABRyZWxlYXNlX3JhdGVfcGVyX3NlYwAAAAsAAAAAAAAACnN0YXJ0X3RpbWUAAAAAAAYAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAPdG90YWxfZGVwb3NpdGVkAAAAAAsAAABDTWF4IHRvdGFsIGRyYXdkb3duIGFsbG93ZWQgaW5zaWRlIHRoZSBjdXJyZW50IHdpbmRvdy4gMCA9IGRpc2FibGVkLgAAAAAMdmVsb2NpdHlfbWF4AAAACwAAADRTbGlkaW5nIHdpbmRvdyBsZW5ndGggZm9yIHZlbG9jaXR5IGNoZWNrcyAoc2Vjb25kcykuAAAAF3ZlbG9jaXR5X3dpbmRvd19zZWNvbmRzAAAAAAYAAAAzQW1vdW50IGFscmVhZHkgZHJhd24gaW4gdGhlIGFjdGl2ZSB2ZWxvY2l0eSB3aW5kb3cuAAAAAAx3aW5kb3dfc3BlbnQAAAALAAAAJFN0YXJ0IG9mIHRoZSBhY3RpdmUgdmVsb2NpdHkgd2luZG93LgAAAAx3aW5kb3dfc3RhcnQAAAAG",
        "AAAAAAAAAN1GdW5kIGEgbmV3IHZhdWx0IGZvciBgYWdlbnRgLiBQdWxscyBgYW1vdW50YCBvZiBgdG9rZW5gIGZyb20gYGFkbWluYCBpbnRvIHRoZSBjb250cmFjdC4KCmB2ZWxvY2l0eV9tYXhgIGlzIHRoZSBtYXggdG90YWwgc3BlbmQgYWxsb3dlZCBwZXIgYHZlbG9jaXR5X3dpbmRvd19zZWNvbmRzYC4KUGFzcyBgdmVsb2NpdHlfbWF4ID0gMGAgdG8gZGlzYWJsZSB0aGUgY2lyY3VpdCBicmVha2VyLgAAAAAAAAxjcmVhdGVfdmF1bHQAAAAKAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABWFnZW50AAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADWNsaWZmX3NlY29uZHMAAAAAAAAGAAAAAAAAABRyZWxlYXNlX3JhdGVfcGVyX3NlYwAAAAsAAAAAAAAADG1heF9wZXJfY2FsbAAAAAsAAAAAAAAACWFsbG93bGlzdAAAAAAAA+oAAAATAAAAAAAAABd2ZWxvY2l0eV93aW5kb3dfc2Vjb25kcwAAAAAGAAAAAAAAAAx2ZWxvY2l0eV9tYXgAAAALAAAAAA==",
        "AAAAAAAAAAAAAAANdmVzdGVkX2Ftb3VudAAAAAAAAAEAAAAAAAAABWFnZW50AAAAAAAAEwAAAAEAAAAL",
        "AAAAAAAAAAAAAAAQY2xhaW1hYmxlX2Ftb3VudAAAAAEAAAAAAAAABWFnZW50AAAAAAAAEwAAAAEAAAAL" ]),
      options
    )
  }
  public readonly fromJSON = {
    pause: this.txFromJSON<null>,
        revoke: this.txFromJSON<i128>,
        unpause: this.txFromJSON<null>,
        drawdown: this.txFromJSON<null>,
        get_vault: this.txFromJSON<VaultInfo>,
        list_vaults: this.txFromJSON<Array<string>>,
        create_vault: this.txFromJSON<null>,
        vested_amount: this.txFromJSON<i128>,
        claimable_amount: this.txFromJSON<i128>
  }
}