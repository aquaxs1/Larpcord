/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, ColorPairField, ImageField, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { t, tNode, useLarpLocale } from "@plugins/larpCore/i18n";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";

import { getRealNames } from "./names";
import { effectLabel, fontLabel, NAME_EFFECTS, NAME_FONTS, resolveEffect } from "./nameStyles";

function Select({ value, options, onChange }: { value: string; options: [string, string][]; onChange(v: string): void; }) {
    return (
        <select className={cl("input")} value={value} onChange={e => onChange(e.currentTarget.value)}>
            {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
    );
}

export function NameTab() {
    const larp = useLarpProfile();
    useLarpLocale();
    const style = larp.nameStyle ?? {};
    const effect = resolveEffect(larp.nameStyle) ?? "";

    const real = getRealNames();
    const { names } = larp;

    return (
        <>
            <Section
                title={t("name.changer.title")}
                description={tNode("name.changer.description", { localOnly: <strong>{t("common.localOnly")}</strong> })}
            >
                <Row label={t("name.changer.displayName")} hint={t("name.changer.real", { name: real.globalName || real.username || "–" })}>
                    <TextField
                        value={names.displayName}
                        maxLength={32}
                        placeholder={real.globalName || real.username || t("name.changer.displayName")}
                        onCommit={displayName => LarpStore.update({ names: { displayName } })}
                    />
                </Row>
                <Row label={t("name.changer.username")} hint={t("name.changer.real", { name: `@${real.username || "–"}` })}>
                    <TextField
                        value={names.username}
                        maxLength={32}
                        placeholder={real.username || t("name.changer.usernamePlaceholder")}
                        onCommit={username => LarpStore.update({ names: { username: username?.replace(/^@/, "") || undefined } })}
                    />
                </Row>
                <Toggle
                    label={t("name.changer.overrideNicknames")}
                    hint={t("name.changer.overrideNicknamesHint")}
                    value={names.overrideNicknames}
                    onChange={overrideNicknames => LarpStore.update({ names: { overrideNicknames } })}
                />
                {(names.username || names.displayName) && (
                    <Btn variant="danger" style={{ marginTop: 12 }} onClick={() => LarpStore.update({ names: { username: undefined, displayName: undefined } })}>
                        {t("name.changer.restore")}
                    </Btn>
                )}
            </Section>

            <Section title={t("name.extras.title")} description={t("name.extras.description")}>
                <Row label={t("name.extras.clanTag")} hint={t("name.extras.clanTagHint")}>
                    <TextField
                        value={larp.clanTag?.tag}
                        maxLength={4}
                        placeholder={t("name.extras.clanTagPlaceholder")}
                        onCommit={tag => LarpStore.update({ clanTag: tag ? { tag, iconUrl: larp.clanTag?.iconUrl } : undefined })}
                    />
                </Row>
                {larp.clanTag && (
                    <Row label={t("name.extras.clanIcon")} hint={t("name.extras.clanIconHint")}>
                        <ImageField value={larp.clanTag.iconUrl} maxBytes={256_000} onCommit={iconUrl => LarpStore.update({ clanTag: { tag: larp.clanTag!.tag, iconUrl } })} />
                    </Row>
                )}
                <Toggle label={t("name.extras.verifiedCheck")} value={larp.extras.verifiedCheck} onChange={verifiedCheck => LarpStore.update({ extras: { verifiedCheck } })} />
                <Toggle label={t("name.extras.ownerCrown")} value={larp.extras.ownerCrown} onChange={ownerCrown => LarpStore.update({ extras: { ownerCrown } })} />
            </Section>

            <Section title={t("name.style.title")} description={t("name.style.description")}>
                <Row label={t("name.style.font")}>
                    <Select
                        value={style.font && NAME_FONTS[style.font] ? style.font : "DEFAULT"}
                        options={Object.keys(NAME_FONTS).map(k => [k, fontLabel(k)])}
                        onChange={font => LarpStore.update({ nameStyle: { ...style, font: font === "DEFAULT" ? undefined : font } })}
                    />
                </Row>
                <Row label={t("name.style.effect")}>
                    <Select
                        value={effect}
                        options={[["", t("name.style.noEffect")], ...Object.keys(NAME_EFFECTS).map(k => [k, effectLabel(k)] as [string, string])]}
                        onChange={e => LarpStore.update({ nameStyle: { ...style, effect: e || undefined, glow: e === "GLOW" } })}
                    />
                </Row>
                <Row label={t("name.style.colors")} hint={t("name.style.colorsHint")}>
                    <ColorPairField
                        value={style.gradient}
                        defaults={["#ff73fa", "#5865f2"]}
                        onCommit={gradient => LarpStore.update({ nameStyle: { ...style, gradient } })}
                    />
                </Row>
                <Toggle
                    label={effectLabel("GLOW")}
                    value={!!style.glow || effect === "GLOW"}
                    onChange={glow => LarpStore.update({ nameStyle: { ...style, glow, effect: glow ? "GLOW" : style.effect === "GLOW" ? undefined : style.effect } })}
                />
                {larp.nameStyle && <Btn variant="danger" style={{ marginTop: 12 }} onClick={() => LarpStore.update({ nameStyle: undefined })}>{t("name.style.reset")}</Btn>}
            </Section>
        </>
    );
}
