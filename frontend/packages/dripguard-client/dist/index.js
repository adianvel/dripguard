import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from "@stellar/stellar-sdk/contract";
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
};
export const Errors = {
    1: { message: "VaultPaused" },
    2: { message: "PayeeNotAllowed" },
    3: { message: "ExceedsPerCallCap" },
    4: { message: "ExceedsVestedBalance" },
    5: { message: "VelocityExceeded" },
    6: { message: "VaultNotFound" },
    7: { message: "Unauthorized" },
    8: { message: "InvalidAmount" },
    9: { message: "VaultAlreadyExists" }
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy(null, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAAAAAAAAAAAFcGF1c2UAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABWFnZW50AAAAAAAAEwAAAAA=",
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
            "AAAAAAAAAAAAAAAQY2xhaW1hYmxlX2Ftb3VudAAAAAEAAAAAAAAABWFnZW50AAAAAAAAEwAAAAEAAAAL"]), options);
        this.options = options;
    }
    fromJSON = {
        pause: (this.txFromJSON),
        revoke: (this.txFromJSON),
        unpause: (this.txFromJSON),
        drawdown: (this.txFromJSON),
        get_vault: (this.txFromJSON),
        list_vaults: (this.txFromJSON),
        create_vault: (this.txFromJSON),
        vested_amount: (this.txFromJSON),
        claimable_amount: (this.txFromJSON)
    };
}
