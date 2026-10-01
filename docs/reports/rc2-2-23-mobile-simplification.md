# RC2.2.23 — Simplificação mobile

Bugs: `MOBILE_INFORMATION_DENSITY` (P2), `REVIEW_HANZI_PHYSICAL_TOO_SMALL` (P2).

## OBSERVED (código / E2E Web em 360 px)

- Conta nova via 5 abas. Agora as abas são **conquistadas**: conta nova = **Jornada + Mais**; Praticar depois da 1ª conclusão real; no máximo 3 itens no começo.
- Mais começa por **Você** (Perfil · Conta · Aparência); depois Estudar / Comunidade / Sistema, com a mesma descoberta progressiva.
- Revisão: feedback curto (hànzì · pinyin · sentido + áudio); literal, mnemônico, exemplo e "o que foi avaliado" em "Ver explicação" (opcional).
- Fim claro: "Revisão concluída" com [Voltar] [Continuar revisando] (continuar só se ainda há algo devido).
- Hànzì em 360 px (computado, `data-review-hanzi`): principal ≥ 64, opção ≥ 48, par/peça ≥ 44. As peças de montagem estavam em 24 px.
- Detalhe da lição na Jornada: uma única ação principal (`data-lesson-primary-cta`) na primeira dobra.
- Perfil: avatar · nome · @username · medalhas · [Editar] [Amigos] na primeira dobra; Sair visível no Mais; excluir conta separado em Conta.

## NOT_TESTED

- Densidade percebida no aparelho do owner: **NOT_RUN**.
