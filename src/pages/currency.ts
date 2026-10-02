import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/app-shell.css";
import "./currency.css";

import {
    mountMarketStrip
} from "../components/market-strip";

const form =
    document.querySelector<HTMLFormElement>(
        "#currency-form"
    );

const amountInput =
    document.querySelector<HTMLInputElement>(
        "#currency-amount"
    );

const fromInput =
    document.querySelector<HTMLInputElement>(
        "#from-currency"
    );

const toInput =
    document.querySelector<HTMLInputElement>(
        "#to-currency"
    );

const convertButton =
    document.querySelector<HTMLButtonElement>(
        "#convert-currency"
    );

const resetButton =
    document.querySelector<HTMLButtonElement>(
        "#reset-currency"
    );

const convertedAmount =
    document.querySelector<HTMLElement>(
        "#converted-amount"
    );

const currencyRate =
    document.querySelector<HTMLElement>(
        "#currency-rate"
    );

const currencyPair =
    document.querySelector<HTMLElement>(
        "#currency-pair"
    );

const message =
    document.querySelector<HTMLElement>(
        "#currency-message"
    );

const formatNumber = (
    value: number
): string => {
    if (!Number.isFinite(value)) {
        return "—";
    }

    return new Intl.NumberFormat(
        undefined,
        {
            maximumFractionDigits: 6
        }
    ).format(value);
};

const setMessage = (
    value: string
): void => {
    if (message) {
        message.textContent =
            value;
    }
};

const convertCurrency =
    async (): Promise<void> => {
        const amount =
            Number(
                amountInput?.value
            );

        const from =
            (
                fromInput?.value ||
                ""
            )
                .trim()
                .toUpperCase();

        const to =
            (
                toInput?.value ||
                ""
            )
                .trim()
                .toUpperCase();

        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {
            setMessage(
                "Enter a valid amount."
            );

            return;
        }

        if (
            !/^[A-Z]{3}$/.test(from) ||
            !/^[A-Z]{3}$/.test(to)
        ) {
            setMessage(
                "Use 3-letter currency codes."
            );

            return;
        }

        if (
            from === to
        ) {
            setMessage(
                "Choose different currencies."
            );

            return;
        }

        if (
            convertButton
        ) {
            convertButton.disabled =
                true;

            convertButton.textContent =
                "Converting...";
        }

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/currency?from=${encodeURIComponent(
                        from
                    )}&to=${encodeURIComponent(
                        to
                    )}&amount=${encodeURIComponent(
                        amount
                    )}`
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to convert currency."
                );
            }

            if (convertedAmount) {
                convertedAmount.textContent =
                    `${data.to} ${formatNumber(
                        Number(
                            data.convertedAmount
                        )
                    )}`;
            }

            if (currencyRate) {
                currencyRate.textContent =
                    `${formatNumber(
                        Number(data.rate)
                    )} ${data.to}`;
            }

            if (currencyPair) {
                currencyPair.textContent =
                    `${data.from}/${data.to}`;
            }
        } catch (error) {
            if (convertedAmount) {
                convertedAmount.textContent =
                    "—";
            }

            if (currencyRate) {
                currencyRate.textContent =
                    "—";
            }

            if (currencyPair) {
                currencyPair.textContent =
                    "—";
            }

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to convert currency."
            );
        } finally {
            if (convertButton) {
                convertButton.disabled =
                    false;

                convertButton.textContent =
                    "Convert";
            }
        }
    };

const resetCurrency =
    (): void => {
        if (amountInput) {
            amountInput.value =
                "";
        }

        if (fromInput) {
            fromInput.value =
                "USD";
        }

        if (toInput) {
            toInput.value =
                "EUR";
        }

        if (convertedAmount) {
            convertedAmount.textContent =
                "—";
        }

        if (currencyRate) {
            currencyRate.textContent =
                "—";
        }

        if (currencyPair) {
            currencyPair.textContent =
                "—";
        }

        setMessage("");
    };

form?.addEventListener(
    "submit",
    (event) => {
        event.preventDefault();

        void convertCurrency();
    }
);

resetButton?.addEventListener(
    "click",
    resetCurrency
);

[
    amountInput,
    fromInput,
    toInput
].forEach(
    (input) => {
        input?.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key ===
                    "Enter"
                ) {
                    event.preventDefault();

                    void convertCurrency();
                }
            }
        );
    }
);

mountMarketStrip();