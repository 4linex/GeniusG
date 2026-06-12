# Metadados das Questões (Lotes 1 e 2)

Referência para cadastro no banco de questões e criação manual no builder de formulários.

## Campos obrigatórios por item

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Código do item** | Identificador único | `LP5_D1_001` |
| **Componente curricular** | Área do conhecimento (MVP: fixo) | Língua Portuguesa |
| **Conteúdo programático** | Assunto / tema | Interpretação de texto |
| **Ano/Série** | Turma (MVP: fixo) | 5º Ano |
| **Descritor SAEB** | Habilidade SAEB | D1 – Localizar informações explícitas |
| **Habilidade BNCC** | Código e descrição BNCC | EF15LP03 |
| **Nível de Bloom** | Taxonomia cognitiva | Lembrar / Compreender / Analisar |
| **Nível de dificuldade** | Fácil, Médio ou Difícil | Fácil |
| **Tempo médio de resolução** | Em segundos | 60, 120, 180 |
| **Tipo de texto-base** | Gênero textual | Bilhete, Aviso, Infográfico |
| **Fonte** | Origem do texto | Texto elaborado para este item |

## Estrutura do item

1. **Texto-base** — material de leitura (pode incluir imagem)
2. **Comando** — pergunta dirigida ao estudante
3. **Alternativas** — A, B, C, D (uma correta)
4. **Gabarito** — letra correta
5. **Resolução comentada** — feedback por alternativa
6. **Leitura diagnóstica** — interpretação pedagógica do acerto/erro
7. **Trilha de recomposição sugerida** — nível 1, 2 ou 3

## Hierarquia no builder de formulários

```
Turma (5º Ano)
  └── Área do conhecimento (Língua Portuguesa)
        └── Assunto (conteúdo programático)
              └── Questão
```

## Parâmetros TRI (3PL)

| Parâmetro | Símbolo | Descrição |
|-----------|---------|-----------|
| Dificuldade | b | Quanto maior, mais difícil |
| Discriminação | a | Capacidade de separar níveis |
| Acerto ao acaso | c | Probabilidade de chute (0,25 para 4 alternativas) |

## Assuntos presentes nos lotes (exemplos)

- Interpretação de texto
- Sinonimia
- Interpretação de texto multissemiótico
- Finalidade de textos (gêneros do cotidiano)

## Pesos por dificuldade (referência)

| Nível | Peso |
|-------|------|
| Fácil | 1,0 |
| Médio | 1,5 |
| Difícil | 2,0 |

Pontuação máxima do instrumento completo (60 itens): **90 pontos**.
