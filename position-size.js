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
    const resetButton = document.querySelector("#reset-position-size");
    const saveButton = document.querySelector("#save-position-size");
    const saveMessage = document.querySelector("#position-size-save-message");

    const result = document.querySelector("#position-size-result");
    const riskAmountResult = document.querySelector("#risk-amount");
    const riskPerUnitResult = document.querySelector("#risk-per-unit");
    const positionSizeResult = document.querySelector("#position-size-value");
    const positionValueResult = document.querySelector("#position-value");

    let lastCalculation = null;

    const formatNumber = (value) => {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 8
        }).format(value);
    };

    const clearResults = () => {
        result.textContent = "—";
        riskAmountResult.textContent = "—";
        riskPerUnitResult.textContent = "—";
        positionSizeResult.textContent = "—";
        positionValueResult.textContent = "—";
    };

    const invalidateCalculation = (message = "—") => {
        lastCalculation = null;
        saveButton.disabled = true;
        result.textContent = message;
        riskAmountResult.textContent = "—";
        riskPerUnitResult.textContent = "—";
        positionSizeResult.textContent = "—";
        positionValueResult.textContent = "—";
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
            invalidateCalculation("Enter valid values");
            return false;
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

        lastCalculation = {
            inputs: {
                direction: direction.value,
                accountBalance: balance,
                riskPercent: risk,
                entryPrice: entry,
                stopLoss: stop
            },
            result: {
                riskAmount,
                riskPerUnit,
                positionSize,
                positionValue
            }
        };

        saveButton.disabled = false;

        if (saveMessage) {
            saveMessage.textContent = "";
        }

        return true;
    };

    const applyUrlContext = () => {
        const params = new URLSearchParams(window.location.search);
        const contextFields = [
            ["direction", direction],
            ["accountBalance", accountBalance],
            ["riskPercent", riskPercent],
            ["entryPrice", entryPrice],
            ["stopLoss", stopLoss]
        ];

        contextFields.forEach(([name, field]) => {
            if (params.has(name)) {
                field.value = params.get(name);
            }
        });

        const hasCompleteContext = contextFields.every(
            ([name]) => params.has(name)
        );

        if (hasCompleteContext) {
            calculatePositionSize();
        }
    };

    resetButton.addEventListener("click", () => {
        direction.value = "long";
        accountBalance.value = "";
        riskPercent.value = "";
        entryPrice.value = "";
        stopLoss.value = "";

        lastCalculation = null;
        saveButton.disabled = true;

        if (saveMessage) {
            saveMessage.textContent = "";
        }

        clearResults();
    });

    calculateButton.addEventListener("click", calculatePositionSize);

    saveButton.addEventListener("click", async () => {
        if (!lastCalculation) {
            return;
        }

        if (typeof supabaseClient === "undefined") {
            saveMessage.textContent = "Unable to save right now.";
            return;
        }

        saveButton.disabled = true;
        saveMessage.textContent = "Saving...";

        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            saveButton.disabled = false;
            saveMessage.textContent = "Sign in to save calculations.";
            return;
        }

        const { error } = await supabaseClient
            .from("saved_calculations")
            .insert({
                user_id: user.id,
                tool: "position-size",
                inputs: lastCalculation.inputs,
                result: lastCalculation.result
            });

        if (error) {
            console.error("Save position size error:", error);
            saveButton.disabled = false;
            saveMessage.textContent = "Unable to save this setup.";
            return;
        }

        saveButton.disabled = false;
        saveMessage.textContent = "Saved to Workspace.";
    });

    calculator.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            calculatePositionSize();
        }
    });

    applyUrlContext();
});