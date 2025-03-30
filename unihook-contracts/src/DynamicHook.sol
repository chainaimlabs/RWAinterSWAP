// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BaseHook} from "uniswap-hooks/base/BaseHook.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";

contract DynamicHook is BaseHook, ERC1155 {
    uint256 public immutable startTimestamp;

    // Start at 5% fee, decaying at rate of 0.00001% per second
    // after 495,000 seconds (5.72 days), fee will be a minimum of 0.05%
    // NOTE: because fees are uint24, we will lose some precision
    uint128 public constant START_FEE = 500000; // represents 5%
    uint128 public constant MIN_FEE = 500; // minimum fee of 0.05%

    uint128 public constant decayRate = 1; // 0.00001% per second

    constructor(
        IPoolManager _poolManager,
        string memory _uri
    ) BaseHook(_poolManager) ERC1155(_uri) {
        startTimestamp = block.timestamp;
    }

    function beforeSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external view override returns (bytes4, BeforeSwapDelta, uint24) {
        uint256 _currentFee;
        unchecked {
            uint256 timeElapsed = block.timestamp - startTimestamp;
            _currentFee = timeElapsed > 495000
                ? uint256(MIN_FEE)
                : (uint256(START_FEE) - (timeElapsed * decayRate)) / 10;
        }

        uint256 overrideFee = _currentFee |
            uint256(LPFeeLibrary.OVERRIDE_FEE_FLAG);
        return (
            BaseHook.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            uint24(overrideFee)
        );
    }

    function afterInitialize(
        address,
        PoolKey calldata key,
        uint160,
        int24,
        bytes calldata
    ) external returns (bytes4) {
        poolManager.updateDynamicLPFee(key, uint24(START_FEE));
        return BaseHook.afterInitialize.selector;
    }

    /// @dev this example hook contract does not implement any hooks
    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: true,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }
}
