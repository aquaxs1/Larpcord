/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Btn, cl, Section } from "@plugins/larpCore/hub/components";
import { decorationUrl } from "@plugins/larpCore/hub/Preview";
import { t, tNode, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, logger, useLarpProfile } from "@plugins/larpCore/store";
import { LarpProfile } from "@plugins/larpCore/types";
import { findStoreLazy } from "@webpack";
import { useMemo, useState } from "@webpack/common";

// Discords Collectibles-Katalog. Wir lesen nur, was der Client ohnehin schon geladen hat.
const CollectiblesCategoryStore = findStoreLazy("CollectiblesCategoryStore");

const enum ItemType {
    Decoration = 0,
    ProfileEffect = 1,
    Nameplate = 2
}

interface CatalogItem {
    skuId: string;
    name: string;
    preview: string;
    raw: any;
}

const PAGE = 120;

const nameplateUrl = (asset: string) => `https://cdn.discordapp.com/assets/collectibles/${asset}static.png`;

function readCatalog(type: ItemType): CatalogItem[] {
    try {
        const { products } = CollectiblesCategoryStore;
        if (!products?.size) return [];

        const items = new Map<string, CatalogItem>();
        for (const product of products.values()) {
            for (const item of product.items ?? []) {
                if (item?.type !== type || !item.skuId || items.has(item.skuId)) continue;

                const ownProduct = products.get(item.skuId);
                const name = ownProduct?.name ?? (product.items.length === 1 ? product.name : undefined) ?? item.title ?? item.label ?? product.name;

                let preview: string | undefined;
                if (type === ItemType.Decoration && item.asset) preview = decorationUrl(item.asset, 96).replace("passthrough=true", "passthrough=false");
                else if (type === ItemType.ProfileEffect) preview = item.thumbnailPreviewSrc ?? item.reducedMotionSrc;
                else if (type === ItemType.Nameplate && item.asset) preview = nameplateUrl(item.asset);
                if (!preview) continue;

                items.set(item.skuId, { skuId: item.skuId, name: String(name), preview, raw: item });
            }
        }
        return [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        logger.error("Collectibles-Katalog konnte nicht gelesen werden", e);
        return [];
    }
}

// Titel als Schlüssel, übersetzt wird erst beim Rendern (Sprachwechsel live)
const KINDS = [
    { type: ItemType.Decoration, titleKey: "decorations.kind.decoration" },
    { type: ItemType.ProfileEffect, titleKey: "decorations.kind.profileEffect" },
    { type: ItemType.Nameplate, titleKey: "decorations.kind.nameplate" }
] as const;

function selectedSku(larp: LarpProfile, type: ItemType) {
    if (type === ItemType.Decoration) return larp.decoration?.skuId;
    if (type === ItemType.ProfileEffect) return larp.profileEffect;
    return larp.nameplate;
}

function select(type: ItemType, item: CatalogItem | undefined) {
    if (type === ItemType.Decoration) {
        LarpStore.update({ decoration: item ? { asset: item.raw.asset, skuId: item.skuId } : undefined });
    } else if (type === ItemType.ProfileEffect) {
        LarpStore.update({ profileEffect: item?.skuId });
    } else {
        LarpStore.update({
            nameplate: item?.skuId,
            nameplateData: item ? { asset: item.raw.asset, label: item.raw.label, palette: item.raw.palette } : undefined
        });
    }
}

function Picker({ type }: { type: ItemType; }) {
    const larp = useLarpProfile();
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(PAGE);
    const catalog = useMemo(() => readCatalog(type), [type]);
    const current = selectedSku(larp, type);

    if (!catalog.length) {
        return (
            <p className={cl("muted")}>
                {tNode("decorations.catalogNotLoaded", { shop: <b>{t("decorations.shop")}</b> })}
                {current && <><br /><br />{tNode("decorations.currentlySelected", { sku: <code>{current}</code> })} <Btn variant="danger" onClick={() => select(type, undefined)}>{t("common.remove")}</Btn></>}
            </p>
        );
    }

    const q = query.trim().toLowerCase();
    const filtered = q ? catalog.filter(i => i.name.toLowerCase().includes(q)) : catalog;
    const selectedItem = catalog.find(i => i.skuId === current);

    return (
        <>
            <div className={cl("inline")} style={{ marginBottom: 12 }}>
                <input className={cl("input")} placeholder={t("decorations.searchPlaceholder", { count: catalog.length })} value={query} onChange={e => { setQuery(e.currentTarget.value); setLimit(PAGE); }} />
                {current && <Btn variant="danger" onClick={() => select(type, undefined)}>{selectedItem ? t("decorations.removeSelected", { name: selectedItem.name }) : t("common.remove")}</Btn>}
            </div>
            <div className={cl("deco-grid", type === ItemType.Nameplate && "deco-grid-wide")}>
                {filtered.slice(0, limit).map(item => (
                    <button
                        key={item.skuId}
                        className={cl("deco-item", item.skuId === current && "deco-item-on")}
                        title={item.name}
                        onClick={() => select(type, item.skuId === current ? undefined : item)}
                    >
                        <img src={item.preview} alt="" loading="lazy" />
                        <span>{item.name}</span>
                    </button>
                ))}
            </div>
            {filtered.length > limit && (
                <Btn variant="secondary" style={{ marginTop: 12 }} onClick={() => setLimit(limit + PAGE)}>
                    {t("decorations.showMore", { more: filtered.length - limit })}
                </Btn>
            )}
        </>
    );
}

export function DecorationsTab() {
    useLarpLocale();
    const [kind, setKind] = useState<ItemType>(ItemType.Decoration);
    const meta = KINDS.find(k => k.type === kind)!;

    return (
        <Section title={t(meta.titleKey)} description={t("decorations.section.description")}>
            <div className={cl("inline")} style={{ marginBottom: 12 }}>
                {KINDS.map(k => (
                    <Btn key={k.type} variant={k.type === kind ? "primary" : "secondary"} onClick={() => setKind(k.type)}>{t(k.titleKey)}</Btn>
                ))}
            </div>
            <Picker key={kind} type={kind} />
        </Section>
    );
}
