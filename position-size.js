document.addEventListener("DOMContentLoaded", () => {
    const calculator = document.querySelector("#position-size-calculator");

    if (!calculator) {
        return;
    }

    const accountBalance = document.querySelector("#account-balance");
    const riskPercent = document.querySelector("#risk-percent");
    const entryPrice = document.querySelector("#entry-price");
    const stopLoss = document.querySelector("#stop-loss");
    const direction = document.querySelector("#position-direction");
    const calculateButton = document.querySelector("#calculate-position-size");

    const result = document.querySelector("#position-size-result");
    const riskAmountResult = document.querySelector("#risk-amount");
    const riskPerUnitResult = document.querySelector("#risk-per-unit");
    const positionSizeResult = document.querySelector("#position-size-value");
    const positionValueResult = document.querySelector("#position-value");

    const formatNumber = (value) => {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 8
        }).format(value);
    };

    const calculatePositionSize = () => {
        const balance = Number(accountBalance.value);
        const risk = Number(riskPercent.value);
        const entry = Number(entryPrice.value);
        const stop = Number(stopLoss.value);
        const validStop =
            direction.value === "long"
                ? stop < entry
                : stop > entry;

        if (
            !Number.isFinite(balance) ||
            !Number.isFinite(risk) ||
            !Number.isFinite(entry) ||
            !Number.isFinite(stop) ||
            balance <= 0 ||
            risk <= 0 ||
            risk >= 100 ||
            entry <= 0 ||
            stop <= 0 ||
            entry === stop ||
            !validStop
        ) {
            result.textContent = "Enter valid values";
            riskAmountResult.textContent = "—";
            riskPerUnitResult.textContent = "—";
            positionSizeResult.textContent = "—";
            positionValueResult.textContent = "—";

            return;
        }

        const riskAmount = balance * (risk / 100);
        const riskPerUnit = Math.abs(entry - stop);
        const positionSize = riskAmount / riskPerUnit;
        const positionValue = positionSize * entry;

        riskAmountResult.textContent = formatNumber(riskAmount);
        riskPerUnitResult.textContent = formatNumber(riskPerUnit);
        positionSizeResult.textContent = formatNumber(positionSize);
        positionValueResult.textContent = formatNumber(positionValue);

        result.textContent = formatNumber(positionSize);
    };

    const resetButton = document.querySelector("#reset-position-size");

    resetButton.addEventListener("click", () => {
        direction.value = "long";
        accountBalance.value = "";
        riskPercent.value = "";
        entryPrice.value = "";
        stopLoss.value = "";

        result.textContent = "—";
        riskAmountResult.textContent = "—";
        riskPerUnitResult.textContent = "—";
        positionSizeResult.textContent = "—";
        positionValueResult.textContent = "—";
    });

    calculateButton.addEventListener("click", calculatePositionSize);

    calculator.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            calculatePositionSize();
        }
    });
});
