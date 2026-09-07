document.addEventListener("DOMContentLoaded", () => {
    const directionInput =
        document.querySelector("#risk-reward-direction");

    const entryInput =
        document.querySelector("#risk-reward-entry");

    const stopInput =
        document.querySelector("#risk-reward-stop");

    const targetInput =
        document.querySelector("#risk-reward-target");

    const calculateButton =
        document.querySelector("#calculate-risk-reward");

    const resetButton =
        document.querySelector("#reset-risk-reward");

    const ratioResult =
        document.querySelector("#risk-reward-ratio");

    const riskResult =
        document.querySelector("#risk-per-unit");

    const rewardResult =
        document.querySelector("#reward-per-unit");

    const breakevenResult =
        document.querySelector("#breakeven-win-rate");

    const formatNumber = (value) => {
        if (!Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString(undefined, {
            maximumFractionDigits: 8
        });
    };

    const calculateRiskReward = () => {
        const direction =
            directionInput.value;

        const entry =
            Number(entryInput.value);

        const stop =
            Number(stopInput.value);

        const target =
            Number(targetInput.value);

        if (
            !Number.isFinite(entry) ||
            !Number.isFinite(stop) ||
            !Number.isFinite(target) ||
            entry <= 0 ||
            stop <= 0 ||
            target <= 0
        ) {
            ratioResult.textContent =
                "Enter valid prices";
            riskResult.textContent = "—";
            rewardResult.textContent = "—";
            breakevenResult.textContent = "—";
            return;
        }

        const validLong =
            direction === "long" &&
            stop < entry &&
            target > entry;

        const validShort =
            direction === "short" &&
            stop > entry &&
            target < entry;

        if (!validLong && !validShort) {
            ratioResult.textContent =
                "Invalid price levels";
            riskResult.textContent = "—";
            rewardResult.textContent = "—";
            breakevenResult.textContent = "—";
            return;
        }

        const risk =
            Math.abs(entry - stop);

        const reward =
            Math.abs(target - entry);

        const ratio =
            reward / risk;

        const breakeven =
            (1 / (1 + ratio)) * 100;

        ratioResult.textContent =
            `1 : ${formatNumber(ratio)}`;

        riskResult.textContent =
            formatNumber(risk);

        rewardResult.textContent =
            formatNumber(reward);

        breakevenResult.textContent =
            `${formatNumber(breakeven)}%`;
    };

    const resetRiskReward = () => {
        directionInput.value = "long";
        entryInput.value = "";
        stopInput.value = "";
        targetInput.value = "";

        ratioResult.textContent = "—";
        riskResult.textContent = "—";
        rewardResult.textContent = "—";
        breakevenResult.textContent = "—";
    };

    calculateButton.addEventListener(
        "click",
        calculateRiskReward
    );

    resetButton.addEventListener(
        "click",
        resetRiskReward
    );

    [
        entryInput,
        stopInput,
        targetInput
    ].forEach((input) => {
        input.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    calculateRiskReward();
                }
            }
        );
    });
});