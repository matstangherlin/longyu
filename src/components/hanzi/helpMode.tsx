import { createContext, useContext, type ReactNode } from "react";

export type MandarinHelpMode = "character" | "word" | "sentence" | "progressive" | "disabled";

export interface MandarinHelpSettings {
  helpMode: MandarinHelpMode;
  disabled: boolean;
}

const DEFAULT_HELP_SETTINGS: MandarinHelpSettings = {
  helpMode: "sentence",
  disabled: false,
};

const MandarinHelpContext = createContext<MandarinHelpSettings>(DEFAULT_HELP_SETTINGS);

export function MandarinHelpProvider({
  helpMode = "sentence",
  disabled = false,
  children,
}: {
  helpMode?: MandarinHelpMode;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <MandarinHelpContext.Provider
      value={{
        helpMode: disabled ? "disabled" : helpMode,
        disabled,
      }}
    >
      {children}
    </MandarinHelpContext.Provider>
  );
}

export function useMandarinHelpSettings(
  overrides?: Partial<MandarinHelpSettings>
): MandarinHelpSettings {
  const context = useContext(MandarinHelpContext);
  const disabled = overrides?.disabled ?? context.disabled;
  const helpMode = disabled ? "disabled" : overrides?.helpMode ?? context.helpMode;
  return { disabled, helpMode };
}


/**
 * RC2.2.8 · D — consulta de Hànzì na revisão.
 *
 * Fora de um provider nada muda (o default é neutro). Dentro dele, cada termo
 * aberto avisa `onLookup` — é assim que a revisão registra
 * `reviewAssistanceUsed` — e o popover ganha "Ver no Atlas".
 */
export interface GlossLookupSettings {
  onLookup?: (text: string) => void;
  atlasLink: boolean;
}

const GlossLookupContext = createContext<GlossLookupSettings>({ atlasLink: false });

export function GlossLookupProvider({
  onLookup,
  atlasLink = true,
  children,
}: {
  onLookup?: (text: string) => void;
  atlasLink?: boolean;
  children: ReactNode;
}) {
  return <GlossLookupContext.Provider value={{ onLookup, atlasLink }}>{children}</GlossLookupContext.Provider>;
}

export function useGlossLookup(): GlossLookupSettings {
  return useContext(GlossLookupContext);
}
