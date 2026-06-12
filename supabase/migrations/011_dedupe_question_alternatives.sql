-- Remove alternativas duplicadas (mesma questão + mesma letra) e impede novas duplicatas

-- Aponta respostas existentes para a alternativa canônica (menor order_index / id)
UPDATE response_answers ra
SET selected_alternative_id = canonical.id
FROM question_alternatives qa
JOIN LATERAL (
  SELECT id
  FROM question_alternatives
  WHERE question_id = qa.question_id
    AND letter = qa.letter
  ORDER BY order_index, id
  LIMIT 1
) canonical ON true
WHERE ra.selected_alternative_id = qa.id
  AND ra.selected_alternative_id <> canonical.id;

-- Remove duplicatas mantendo uma por (question_id, letter)
DELETE FROM question_alternatives qa
WHERE qa.id NOT IN (
  SELECT DISTINCT ON (question_id, letter) id
  FROM question_alternatives
  ORDER BY question_id, letter, order_index, id
);

CREATE UNIQUE INDEX IF NOT EXISTS question_alternatives_question_id_letter_key
  ON question_alternatives (question_id, letter);
