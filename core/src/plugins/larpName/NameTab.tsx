/*
 * Larpcord, a standalone Discord client for local cosmetic larping
 * Copyright (c) 2026 Larpcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Btn, cl, ColorPairField, ImageField, Row, Section, TextField, Toggle } from "@plugins/larpCore/hub/components";
import { LarpStore, useLarpProfile } from "@plugins/larpCore/store";

import { NAME_EFFECTS, NAME_FONTS, resolveEffect } from "./nameStyles";

function Select({ value, options, onChange }: { value: string; options: [string, string][]; onChange(v: string): void; }) {
    return (
        <select className={cl("input")} value={value} onChange={e => onChange(e.currentTarget.value)}>
            {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
    );
}

export function NameTab() {
    const larp = useLarpProfile();
    const style = larp.nameStyle ?? {};
    const effect = resolveEffect(larp.nameStyle) ?? "";

    return (
        <>
            <Section title="Neben deinem Namen" description="Erscheint im Chat, in der Mitgliederliste und in deinem Profil.">
                <Row label="Clan-Tag" hint="Max. 4 Zeichen, leer = aus">
                    <TextField
                        value={larp.clanTag?.tag}
                        maxLength={4}
                        placeholder="z. B. OG"
                        onCommit={tag => LarpStore.update({ clanTag: tag ? { tag, iconUrl: larp.clanTag?.iconUrl } : undefined })}
                    />
                </Row>
                {larp.clanTag && (
                    <Row label="Clan-Icon" hint="Kleines Bild vor dem Tag (optional)">
                        <ImageField value={larp.clanTag.iconUrl} maxBytes={256_000} onCommit={iconUrl => LarpStore.update({ clanTag: { tag: larp.clanTag!.tag, iconUrl } })} />
                    </Row>
                )}
                <Toggle label="Verified-Häkchen" value={larp.extras.verifiedCheck} onChange={verifiedCheck => LarpStore.update({ extras: { verifiedCheck } })} />
                <Toggle label="Owner-Krone" value={larp.extras.ownerCrown} onChange={ownerCrown => LarpStore.update({ extras: { ownerCrown } })} />
            </Section>

            <Section title="Namens-Stil" description="Nutzt Discords eigene Anzeigenamen-Stile, damit er überall gleich aussieht.">
                <Row label="Schriftart">
                    <Select
                        value={style.font && NAME_FONTS[style.font] ? style.font : "DEFAULT"}
                        options={Object.entries(NAME_FONTS).map(([k, f]) => [k, f.label])}
                        onChange={font => LarpStore.update({ nameStyle: { ...style, font: font === "DEFAULT" ? undefined : font } })}
                    />
                </Row>
                <Row label="Effekt">
                    <Select
                        value={effect}
                        options={[["", "Keiner"], ...Object.entries(NAME_EFFECTS).map(([k, e]) => [k, e.label] as [string, string])]}
                        onChange={e => LarpStore.update({ nameStyle: { ...style, effect: e || undefined, glow: e === "GLOW" } })}
                    />
                </Row>
                <Row label="Farben" hint="Erste Farbe für Einfarbig/Glow, beide für Verläufe">
                    <ColorPairField
                        value={style.gradient}
                        defaults={["#ff73fa", "#5865f2"]}
                        onCommit={gradient => LarpStore.update({ nameStyle: { ...style, gradient } })}
                    />
                </Row>
                <Toggle
                    label="Glow"
                    value={!!style.glow || effect === "GLOW"}
                    onChange={glow => LarpStore.update({ nameStyle: { ...style, glow, effect: glow ? "GLOW" : style.effect === "GLOW" ? undefined : style.effect } })}
                />
                {larp.nameStyle && <Btn variant="danger" style={{ marginTop: 12 }} onClick={() => LarpStore.update({ nameStyle: undefined })}>Stil zurücksetzen</Btn>}
            </Section>
        </>
    );
}
