use starknet::ContractAddress;

#[starknet::interface]
trait IContextRegistry<TContractState> {
    fn set_context_hash(ref self: TContractState, hash: felt252);
    fn get_context_hash(self: @TContractState, user: ContractAddress) -> felt252;
}

#[starknet::contract]
mod ContextRegistry {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        context_hashes: Map<ContractAddress, felt252>,
    }

    #[abi(embed_v0)]
    impl ContextRegistryImpl of super::IContextRegistry<ContractState> {
        fn set_context_hash(ref self: ContractState, hash: felt252) {
            let caller = get_caller_address();
            self.context_hashes.entry(caller).write(hash);
        }

        fn get_context_hash(self: @ContractState, user: ContractAddress) -> felt252 {
            self.context_hashes.entry(user).read()
        }
    }
}
