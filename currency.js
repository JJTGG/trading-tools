document.addEventListener("DOMContentLoaded", () => {
    const amountInput =
        document.querySelector("#currency-amount");

    const fromInput =
        document.querySelector("#from-currency");

    const toInput =
        document.querySelector("#to-currency");

    const convertButton =
        document.querySelector("#convert-currency");

    const resetButton =
        document.querySelector("#reset-currency");

    const convertedAmount =
        document.querySelector("#converted-amount");

    const currencyRate =
        document.querySelector("#currency-rate");

    const currencyPair =
        document.querySelector("#currency-pair");

    const formatNumber = (value) => {
        if (!Number.isFinite(Number(value))) {
            return "—";
        }

        return Number(value).toLocaleString(undefined, {
            maximumFractionDigits: 6
        });
    };

    const convertCurrency = async () => {
        const amount = Number(amountInput.value);
        const from = fromInput.value.trim().toUpperCase();
        const to = toInput.value.trim().toUpperCase();

        if (!Number.isFinite(amount) || amount < 0) {
            convertedAmount.textContent =
                "Enter a valid amount";
            return;
        }

        if (!/^[A-Z]{3}$/.test(from) ||
            !/^[A-Z]{3}$/.test(to)) {
            convertedAmount.textContent =
                "Use 3-letter currency codes";
            return;
        }

        convertButton.disabled = true;
        convertButton.textContent = "Converting...";

        try {
            const response = await fetch(
                `/api/currency?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to convert currency"
                );
            }

            convertedAmount.textContent =
                `${data.to} ${formatNumber(data.convertedAmount)}`;

            currencyRate.textContent =
                `${formatNumber(data.rate)} ${data.to}`;

            currencyPair.textContent =
                `${data.from}/${data.to}`;
        } catch (error) {
            convertedAmount.textContent =
                error.message;

            currencyRate.textContent = "—";
            currencyPair.textContent = "—";
        } finally {
            convertButton.disabled = false;
            convertButton.textContent = "Convert";
        }
    };

    const resetCurrency = () => {
        amountInput.value = "";
        fromInput.value = "USD";
        toInput.value = "EUR";

        convertedAmount.textContent = "—";
        currencyRate.textContent = "—";
        currencyPair.textContent = "—";
    };

    convertButton.addEventListener(
        "click",
        convertCurrency
    );

    resetButton.addEventListener(
        "click",
        resetCurrency
    );

    [amountInput, fromInput, toInput].forEach(
        (input) => {
            input.addEventListener(
                "keydown",
                (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        convertCurrency();
                    }
                }
            );
        }
    );
});