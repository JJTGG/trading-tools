document.addEventListener("DOMContentLoaded", () => {
    const positionInput =
        document.querySelector("#position-value");

    const equityInput =
        document.querySelector("#account-equity");

    const calculateButton =
        document.querySelector("#calculate-leverage");

    const resetButton =
        document.querySelector("#reset-leverage");

    const leverageResult =
        document.querySelector("#leverage-ratio");

    const positionResult =
        document.querySelector("#leverage-position-value");

    const equityResult =
        document.querySelector("#leverage-equity");

    const marginResult =
        document.querySelector("#margin-requirement");

    const formatNumber = (value) => {
        if (!Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString(undefined, {
            maximumFractionDigits: 8
        });
    };

    const calculateLeverage = () => {
        const positionValue =
            Number(positionInput.value);

        const accountEquity =
            Number(equityInput.value);

        if (
            !Number.isFinite(positionValue) ||
            !Number.isFinite(accountEquity) ||
            positionValue <= 0 ||
            accountEquity <= 0
        ) {
            leverageResult.textContent =
                "Enter valid values";

            positionResult.textContent = "—";
            equityResult.textContent = "—";
            marginResult.textContent = "—";

            return;
        }

        const leverage =
            positionValue / accountEquity;

        const marginRequirement =
            (accountEquity / positionValue) * 100;

        leverageResult.textContent =
            `${formatNumber(leverage)}:1`;

        positionResult.textContent =
            formatNumber(positionValue);

        equityResult.textContent =
            formatNumber(accountEquity);

        marginResult.textContent =
            `${formatNumber(marginRequirement)}%`;
    };

    const resetLeverage = () => {
        positionInput.value = "";
        equityInput.value = "";

        leverageResult.textContent = "—";
        positionResult.textContent = "—";
        equityResult.textContent = "—";
        marginResult.textContent = "—";
    };

    calculateButton.addEventListener(
        "click",
        calculateLeverage
    );

    resetButton.addEventListener(
        "click",
        resetLeverage
    );

    [positionInput, equityInput].forEach(
        (input) => {
            input.addEventListener(
                "keydown",
                (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        calculateLeverage();
                    }
                }
            );
        }
    );
});