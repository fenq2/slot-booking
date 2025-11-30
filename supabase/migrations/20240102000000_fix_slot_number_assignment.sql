-- Оновлюємо функцію book_slot щоб вона заповнювала перший вільний номер слота
CREATE OR REPLACE FUNCTION book_slot(
  p_gathering_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_max_slots INTEGER;
  v_current_slots INTEGER;
  v_new_slot_number INTEGER;
BEGIN
  -- Блокування рядка збору для послідовного виконання
  SELECT max_slots INTO v_max_slots
  FROM gatherings
  WHERE id = p_gathering_id
  FOR UPDATE;
  
  -- Перевірка статусу збору
  IF NOT EXISTS (
    SELECT 1 FROM gatherings 
    WHERE id = p_gathering_id 
    AND status = 'open'
    AND gathering_date > NOW()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'gathering_not_available'
    );
  END IF;
  
  -- Перевірка чи користувач вже має слот
  IF EXISTS (
    SELECT 1 FROM slots 
    WHERE gathering_id = p_gathering_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_booked'
    );
  END IF;
  
  -- Перевірка доступних слотів
  SELECT COUNT(*) INTO v_current_slots
  FROM slots
  WHERE gathering_id = p_gathering_id;
  
  IF v_current_slots >= v_max_slots THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_slots_available'
    );
  END IF;
  
  -- Знайти перший вільний номер (gap)
  -- Використовуємо generate_series для створення послідовності від 1 до max_slots
  -- і LEFT JOIN щоб знайти перший пропуск
  SELECT COALESCE(
    (SELECT s.slot_num
     FROM generate_series(1, v_max_slots) AS s(slot_num)
     LEFT JOIN slots sl ON sl.gathering_id = p_gathering_id AND sl.slot_number = s.slot_num
     WHERE sl.id IS NULL
     ORDER BY s.slot_num
     LIMIT 1),
    -- Якщо всі номери зайняті (не повинно статися через перевірку вище)
    (SELECT COALESCE(MAX(slot_number), 0) + 1
     FROM slots
     WHERE gathering_id = p_gathering_id)
  ) INTO v_new_slot_number;
  
  -- Створити слот
  INSERT INTO slots (gathering_id, user_id, slot_number)
  VALUES (p_gathering_id, p_user_id, v_new_slot_number);
  
  RETURN json_build_object(
    'success', true,
    'slot_number', v_new_slot_number
  );
END;
$$ LANGUAGE plpgsql;

