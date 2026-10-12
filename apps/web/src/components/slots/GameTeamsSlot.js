import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
/**
 * Typed slot for Dev 3's AI Team Balancing widget in GameDetailsPage.
 * Renders null (or fallback) by default until Dev 3 implements team formation UI.
 */
export function GameTeamsSlot({ fallback = null }) {
    return fallback ? _jsx(_Fragment, { children: fallback }) : null;
}
