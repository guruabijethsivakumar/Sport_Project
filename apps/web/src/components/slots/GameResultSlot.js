import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
/**
 * Typed slot for Dev 3's Match Results & Verification widget in GameDetailsPage.
 * Renders null (or fallback) by default until Dev 3 implements results flow UI.
 */
export function GameResultSlot({ fallback = null }) {
    return fallback ? _jsx(_Fragment, { children: fallback }) : null;
}
