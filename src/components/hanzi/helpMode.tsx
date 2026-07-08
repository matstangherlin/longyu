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

