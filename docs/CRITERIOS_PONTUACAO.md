# Critérios de Pontuação e Trilhas de Recomposição

Consolidado do documento técnico do projeto RDA.

## Fórmula de pontuação ponderada

```
Pontuação final = (acertos fáceis × 1,0) + (acertos médios × 1,5) + (acertos difíceis × 2,0)
Percentual = (pontuação final / 90) × 100
```

Distribuição do instrumento: **20 fáceis + 20 médios + 20 difíceis = 60 questões**.

## Régua de proficiência

| Faixa | Percentual | Nível | Trilha |
|-------|------------|-------|--------|
| 0–44 pts | até 49% | Insuficiente | Trilha 1 — Recomposição de base |
| 45–67 pts | 50–74% | Em desenvolvimento | Trilha 2 — Desenvolvimento da compreensão |
| 68–90 pts | 75–100% | Proficiente | Trilha 3 — Ampliação e aprofundamento |

## Mapeamento no sistema (MVP)

| Documento | Sistema |
|-----------|---------|
| Insuficiente | `inicial` |
| Em desenvolvimento | `intermediario` |
| Proficiente | `avancado` |

## Regras complementares de direcionamento

| Desempenho | Encaminhamento |
|------------|----------------|
| Baixo acerto nas **fáceis** | Trilha 1, mesmo com acertos isolados em médias/difíceis |
| Bom nas fáceis, baixo nas médias | Trilha 2 |
| Bom nas fáceis e médias, baixo nas difíceis | Trilha 2 com aprofundamento pontual |
| Bom nos três níveis | Trilha 3 |
| Acertos concentrados em poucos descritores | Recomposição por habilidade + trilha global |

## Regra de segurança (plataforma)

Se o estudante acertar **menos de 60% dos itens fáceis** (menos de 12 de 20), manter direcionamento para **Trilha 1**, mesmo que a pontuação total se aproxime da faixa intermediária.

## Cálculo no MVP

- **TCT:** percentual simples de acertos
- **TRI 3PL:** estimativa de θ (habilidade) via MLE
- **Classificação:** nível de proficiência derivado de θ e/ou percentual
- **Trilha:** atribuída automaticamente ao professor (aluno **não** vê trilha nem pontuação)

## Campos mínimos por resposta (implementação)

- Código do item
- Descritor SAEB / Habilidade BNCC
- Nível de dificuldade e peso
- Gabarito e resposta do estudante
- Status de acerto
- Pontuação obtida (uso interno — professor/relatórios)
- Trilha associada
