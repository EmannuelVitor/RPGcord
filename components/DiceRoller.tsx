"use client";

import { ArrowRight, Dices, Minus, Plus, ScrollText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { characterNameOf, composeName } from "@/lib/display-name";
import { VALIDATION_LABELS } from "@/lib/dice";
import { buildCharacterFields } from "@/lib/sheet-template";
import type { Character, DiceRoll, DiceValidationMode, MapToken, SheetStatusValue, SheetTemplate } from "@/lib/types";

type Props = {
  rolls: DiceRoll[];
  tokens?: MapToken[];
  character: Character;
  template: SheetTemplate;
  hasCharacter: boolean;
  playerName: string;
  onOpenSheet: () => void;
  onRoll: (sides: number, modifier: number, quantity: number, validationMode: DiceValidationMode) => Promise<DiceRoll>;
};

const dice = [4, 6, 8, 10, 12, 20, 100];

function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  return `há ${minutes} min`;
}

export function DiceRoller({ rolls, tokens = [], character, template, hasCharacter, playerName, onOpenSheet, onRoll }: Props) {
  const nameOf = (roll: DiceRoll) => composeName(characterNameOf(roll.userId, tokens), roll.userName) || roll.userName;

  // Todas as barras de status definidas no modelo da ficha, no valor atual.
  const statusBars = useMemo(() => {
    const values = buildCharacterFields(character, template);
    return template.fields
      .filter((field) => field.type === "status")
      .map((field) => {
        const raw = values[field.id];
        const status: SheetStatusValue = raw && typeof raw === "object" ? raw as SheetStatusValue : { current: 0, max: 0 };
        const percent = status.max > 0 ? Math.max(0, Math.min(100, (status.current / status.max) * 100)) : 0;
        return { id: field.id, label: field.label, ...status, percent };
      });
  }, [character, template]);

  const characterName = character.name.trim() || "Crie sua personagem";
  const initials = characterName.split(/s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [selected, setSelected] = useState(20);
  const [modifier, setModifier] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [validationMode, setValidationMode] = useState<DiceValidationMode>("sum");
  const [rolling, setRolling] = useState(false);
  const [flash, setFlash] = useState<number>();

  async function roll() {
    if (rolling) return;
    setRolling(true);
    const result = await onRoll(selected, modifier, quantity, validationMode);
    setFlash(result.total);
    window.setTimeout(() => { setRolling(false); setFlash(undefined); }, 520);
  }

  return (
    <aside className="dice-card panel">
      <section className={"dice-character" + (hasCharacter ? "" : " empty")}>
        <div className="dice-character-head">
          <span className="dice-portrait">{character.imageUrl ? <img src={character.imageUrl} alt="" /> : initials}</span>
          <div>
            <p className="eyebrow">Seu personagem</p>
            <strong>{characterName}{hasCharacter ? <>{" "}<em>({playerName})</em></> : null}</strong>
            <span>{hasCharacter
              ? `${character.ancestry || "Sem ancestralidade"} · ${character.characterClass || "Sem classe"} ${character.level}`
              : "Crie a ficha para gerar seu pino no mapa"}</span>
          </div>
          <button className="dice-sheet-button" onClick={onOpenSheet}><ScrollText size={14} /> {hasCharacter ? "Ficha" : "Criar"} <ArrowRight size={13} /></button>
        </div>
        {hasCharacter && statusBars.length > 0 ? (
          <div className="dice-status-bars">
            {statusBars.map((bar) => (
              <div key={bar.id}>
                <p><span>{bar.label}</span><b>{bar.current}/{bar.max}</b></p>
                <i><em style={{ width: `${bar.percent}%` }} /></i>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <header className="panel-header dice-title">
        <div><p className="eyebrow">Oráculo</p><h2>Rolagem de dados</h2></div>
        <Dices size={21} />
      </header>

      <div className="dice-picker" aria-label="Escolha um dado">
        {dice.map((sides) => (
          <button key={sides} className={selected === sides ? "selected" : ""} onClick={() => setSelected(sides)}>
            <span className="die-shape">{sides}</span>d{sides}
          </button>
        ))}
      </div>

      <div className="modifier-row">
        <label>Modificador</label>
        <div>
          <button onClick={() => setModifier((value) => value - 1)} aria-label="Diminuir modificador"><Minus size={15} /></button>
          <strong>{modifier >= 0 ? "+" : ""}{modifier}</strong>
          <button onClick={() => setModifier((value) => value + 1)} aria-label="Aumentar modificador"><Plus size={15} /></button>
        </div>
      </div>

      <div className="dice-options">
        <div className="quantity-control">
          <label>Quantidade de dados</label>
          <div>
            <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade de dados"><Minus size={15} /></button>
            <strong>{quantity}×</strong>
            <button onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="Aumentar quantidade de dados"><Plus size={15} /></button>
          </div>
        </div>
        <label className="validation-mode">Modelo de validação
          <select value={validationMode} onChange={(event) => setValidationMode(event.target.value as DiceValidationMode)}>
            <option value="sum">Somar todos os dados</option>
            <option value="highest">Pegar o maior dado</option>
            <option value="lowest">Pegar o menor dado</option>
          </select>
        </label>
      </div>

      <button className={`roll-button ${rolling ? "rolling" : ""}`} onClick={roll}>
        <Sparkles size={17} /> {flash !== undefined ? `Resultado: ${flash}` : `Rolar ${quantity}d${selected}${modifier ? ` ${modifier > 0 ? "+" : ""}${modifier}` : ""}`}
      </button>

      <div className="roll-divider"><span>histórico da mesa</span></div>
      <div className="roll-log" aria-live="polite">
        {rolls.map((roll, index) => (
          <article className={index === 0 ? "latest" : ""} key={roll.id}>
            <div className="roll-avatar">{nameOf(roll).slice(0, 1).toUpperCase()}</div>
            <div className="roll-copy">
              <strong>{nameOf(roll)}</strong>
              <span>rolou {roll.quantity && roll.quantity > 1 ? `${roll.quantity}d${roll.sides}` : `d${roll.sides}`}{roll.modifier ? ` ${roll.modifier > 0 ? "+" : ""}${roll.modifier}` : ""}</span>
              <span className="roll-details">{VALIDATION_LABELS[roll.validationMode ?? "sum"]}{roll.results && roll.results.length > 1 ? `: [${roll.results.join(", ")}]` : ""}</span>
            </div>
            <div className="roll-result">
              <strong>{roll.total}</strong>
              <span>{relativeTime(roll.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
