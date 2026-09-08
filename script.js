document.addEventListener("DOMContentLoaded", () => {
    const calculator = document.querySelector("#pnl-calculator");

    if (!calculator) {
        return;
    }

    const direction = document.querySelector("#pnl-direction");
    const entry = document.querySelector("#pnl-entry");
    const exit = document.querySelector("#pnl-exit");
    const size = document.querySelector("#pnl-size");
    const fees = document.querySelector("#pnl-fees");
    const calculateButton = document.querySelector("#calculate-pnl");
    const resetButton = document.querySelector("#reset-pnl");
    const saveButton = document.querySelector("#save-pnl");
    const saveMessage = document.querySelector("#pnl-save-message");

    const result = document.querySelector("#pnl-result");
    const priceDifference = document.querySelector("#pnl-price-difference");
    const gross = document.querySelector("#pnl-gross");
    const feesResult = document.querySelector("#pnl-fees-result");
    const net = document.querySelector("#pnl-net");
    const returnValue = document.querySelector("#pnl-return");

    let lastCalculation = null;

    const formatNumber = (value) => {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 8
        }).format(value);
    };

    const calculatePnL = () => {
        const entryPrice = Number(entry.value);
        const exitPrice = Number(exit.value);
        const positionSize = Number(size.value);
        const totalFees = Number(fees.value) || 0;

        if (
            !Number.isFinite(entryPrice) ||
            !Number.isFinite(exitPrice) ||
            !Number.isFinite(positionSize) ||
            entryPrice <= 0 ||
            exitPrice <= 0 ||
            positionSize <= 0 ||
            totalFees < 0
        ) {
            result.textContent = "Enter valid values";
            priceDifference.textContent = "—";
            gross.textContent = "—";
            feesResult.textContent = "—";
            net.textContent = "—";
            returnValue.textContent = "—";

            lastCalculation = null;
            saveButton.disabled = true;
            saveMessage.textContent = "";

            return;
        }

        const difference =
            direction.value === "long"
                ? exitPrice - entryPrice
                : entryPrice - exitPrice;

        const grossPnL = difference * positionSize;
        const netPnL = grossPnL - totalFees;

        const positionValue = entryPrice * positionSize;

        const percentageReturn =
            positionValue > 0
                ? (netPnL / positionValue) * 100
                : 0;

        priceDifference.textContent = formatNumber(difference);
        gross.textContent = formatNumber(grossPnL);
        feesResult.textContent = formatNumber(totalFees);
        net.textContent = formatNumber(netPnL);
        returnValue.textContent = `${formatNumber(percentageReturn)}%`;

        result.textContent = formatNumber(netPnL);

        lastCalculation = {
            inputs: {
                direction: direction.value,
                entryPrice,
                exitPrice,
                positionSize,
                fees: totalFees
            },
            result: {
                priceDifference: difference,
                grossPnL,
                fees: totalFees,
                netPnL,
                percentageReturn
            }
        };

        saveButton.disabled = false;
        saveMessage.textContent = "";
    };

    resetButton.addEventListener("click", () => {
        direction.value = "long";
        entry.value = "";
        exit.value = "";
        size.value = "";
        fees.value = "0";

        result.textContent = "—";
        priceDifference.textContent = "—";
        gross.textContent = "—";
        feesResult.textContent = "—";
        net.textContent = "—";
        returnValue.textContent = "—";

        lastCalculation = null;
        saveButton.disabled = true;
        saveMessage.textContent = "";
    });

    saveButton.addEventListener("click", async () => {
        if (!lastCalculation) {
            return;
        }

        saveButton.disabled = true;
        saveMessage.textContent = "Saving...";

        try {
            const {
                data: { user },
                error: userError
            } = await supabaseClient.auth.getUser();

            if (userError || !user) {
                saveMessage.textContent = "Sign in to save calculations.";
                saveButton.disabled = false;
                return;
            }

            const { error } = await supabaseClient
                .from("saved_calculations")
                .insert({
                    user_id: user.id,
                    tool: "pnl-calculator",
                    inputs: lastCalculation.inputs,
                    result: lastCalculation.result
                });

            if (error) {
                console.error("Save calculation error:", error);
                saveMessage.textContent = "Unable to save calculation.";
                saveButton.disabled = false;
                return;
            }

            saveMessage.textContent = "Calculation saved.";
        } catch (error) {
            console.error("Save calculation request failed:", error);
            saveMessage.textContent =
                `Save failed: ${error.message || "Unknown error"}`;
            saveButton.disabled = false;
        }
    });

    calculateButton.addEventListener("click", calculatePnL);

    calculator.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            calculatePnL();
        }
    });
});