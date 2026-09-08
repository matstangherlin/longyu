import { useEffect, useRef, useState, type RefObject } from "react";

import { Button } from "../../components/ui/primitives";
import { IconSound } from "../../components/ui/Icon";
import { t } from "../../i18n/catalog";
import {
  ensureMicPermission,
  isRecognitionAvailable,
  isSecureMicContext,
  recognizeOnce,
  speechErrorMessage,
  type RecognizeHandle,
} from "../../lib/speech";

/**
 * V4.9.5A.1 — o campo de resposta aberta do Longyu inteiro.
 *
 * Morava dentro de steps.tsx e por isso a cena de conversa tinha um
 * <textarea> proprio: o mesmo tipo pedagogico — produzir a propria frase —
 * chegava com microfone em um lugar e sem microfone no outro. Uma tarefa que
 * promete "escreva ou fale" precisa entregar as duas coisas em todo lugar
 * onde ela aparece, entao a implementacao e uma so.
 *
 * Contratos que este componente carrega:
 *  - hanzi, pinyin e fala levam ao MESMO avaliador de quem chama;
 *  - a fala PROPOE quando ja existe texto: nunca apaga o que o aluno digitou;
 *  - nada e enviado sozinho a partir de uma transcricao;
 *  - sem speech disponivel o exercicio continua inteiro por texto;
 *  - alvo de toque de 44px e nome acessivel no botao de voz.
 */
export function FreeAnswerField({
  value,
  onChange,
  disabled,
  placeholder,
  onSubmit,
  speechAsAlternative = false,
  rows = 2,
  inputRef,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  placeholder: string;
  onSubmit: () => void;
  /** Se true, o mic vira link discreto em vez de botão ao lado do campo. */
  speechAsAlternative?: boolean;
  rows?: number;
  /** Para quem precisa devolver o foco ao campo (banco de peças, sugestão). */
  inputRef?: RefObject<HTMLTextAreaElement>;
  ariaLabel?: string;
}) {
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const handleRef = useRef<RecognizeHandle | null>(null);
  const speechSupported = isRecognitionAvailable() && isSecureMicContext();

  useEffect(() => () => handleRef.current?.stop(), []);

  function stopListening() {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
  }

  async function startListening() {
    if (disabled) return;
    if (listening) {
      stopListening();
      return;
    }
    setMicError(null);
    const permission = await ensureMicPermission();
    if (permission !== "granted") {
      setMicError(speechErrorMessage(permission === "denied" ? "not-allowed" : "unsupported"));
      return;
    }
    setListening(true);
    handleRef.current = recognizeOnce(
      (transcript) => {
        setListening(false);
        handleRef.current = null;
        if (!transcript) return;
        // P0.13 — o que o aluno digitou é trabalho dele. Campo vazio recebe a
        // transcrição direto; campo com texto recebe uma PROPOSTA, que ele
        // aceita ou ignora. Sobrescrever em silêncio destruía a resposta de
        // quem tocou o microfone só para conferir a pronúncia.
        if (!value.trim()) onChange(transcript);
        else setPendingTranscript(transcript);
      },
      (code) => {
        setListening(false);
        handleRef.current = null;
        setMicError(speechErrorMessage(code));
      },
      { lang: "zh-CN" }
    );
  }

  return (
    <div className={speechAsAlternative ? "mt-2" : "mt-3.5"}>
      <textarea
        ref={inputRef}
        value={value}
        lang="zh-CN"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onFocus={(event) => {
          const target = event.currentTarget;
          window.requestAnimationFrame(() => {
            target.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            if (composing || event.nativeEvent.isComposing) return;
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        aria-label={ariaLabel ?? t("player.yourAnswer")}
        className="w-full resize-none rounded-2xl border border-line bg-surface-2 p-3.5 text-lg text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-60"
      />
      {speechAsAlternative ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {speechSupported ? (
            <button
              type="button"
              disabled={disabled}
              onClick={startListening}
              aria-pressed={listening}
              className="text-xs font-medium text-ink-mute underline decoration-line underline-offset-2 transition hover:text-ink disabled:opacity-50"
            >
              {listening ? t("player.listeningTapStop") : t("player.orSpeakAnswer")}
            </button>
          ) : null}
          <span className="text-xs text-ink-faint">{t("player.hanziOrPinyinOk")}</span>
        </div>
      ) : (
        <>
          {speechSupported && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                variant={listening ? "soft" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={startListening}
                aria-pressed={listening}
                data-testid="free-answer-mic"
                // P0.2 — 44px de alvo de toque. O botão media 16px de altura:
                // existia na tela e não dava para acertar com o polegar, que é
                // exatamente como a fala é usada.
                className="min-h-11"
              >
                <IconSound width={18} height={18} aria-hidden="true" />
                {listening ? t("player.listeningTapStop") : t("player.speak")}
              </Button>
              <span className="text-xs text-ink-faint">{t("player.hanziOrPinyinOk")}</span>
            </div>
          )}
          {!speechSupported && <p className="mt-2 text-xs text-ink-faint">{t("player.hanziOrPinyinOk")}</p>}
        </>
      )}
      {/*
        P0.12 e P0.13 — a fala vira PROPOSTA quando já existe texto no campo.
        O aluno vê o que foi entendido, decide, e nada é enviado sozinho:
        reconhecimento de voz erra, e enviar automaticamente transformaria um
        erro do reconhecedor em erro dele.
      */}
      {pendingTranscript && (
        <div
          className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2"
          data-testid="free-answer-transcript"
          role="status"
          aria-live="polite"
        >
          <span className="min-w-0 text-sm text-ink">
            {t("player.heardTranscript")}{" "}
            <span lang="zh-CN" className="font-semibold">
              {pendingTranscript}
            </span>
          </span>
          <Button
            size="sm"
            className="min-h-11"
            data-testid="free-answer-transcript-use"
            onClick={() => {
              onChange(pendingTranscript);
              setPendingTranscript(null);
            }}
          >
            {t("player.useSpeech")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="min-h-11"
            data-testid="free-answer-transcript-dismiss"
            onClick={() => setPendingTranscript(null)}
          >
            {t("player.keepTyping")}
          </Button>
        </div>
      )}
      {micError && <p className="mt-2 text-xs text-ink-soft">{micError}</p>}
    </div>
  );
}
