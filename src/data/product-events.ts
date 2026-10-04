import { supabaseClient } from "./supabase";

export type ProductEventProperties =
    Record<
        string,
        string | number | boolean | null
    >;

export const trackProductEvent = async (
    eventName: string,
    page: string,
    properties: ProductEventProperties = {}
): Promise<void> => {
    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("product_events")
            .insert({
                event_name: eventName,
                page,
                properties
            });

    if (error) {
        console.error(
            "Product event tracking error:",
            error
        );
    }
};