-- Безпечна версія міграції з перевірками наявності таблиць
-- Використовуйте цей файл якщо таблиці вже існують

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Перевірка та створення таблиці profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      telegram_id BIGINT UNIQUE,
      telegram_username TEXT,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Index для швидкого пошуку за display_name (якщо не існує)
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Перевірка та створення таблиці gatherings
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gatherings') THEN
    CREATE TABLE gatherings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      max_slots INTEGER NOT NULL DEFAULT 10 CHECK (max_slots >= 2 AND max_slots <= 100),
      gathering_date TIMESTAMPTZ NOT NULL,
      booking_deadline TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled'))
    );
  END IF;
END $$;

-- Indexes для gatherings (якщо не існують)
CREATE INDEX IF NOT EXISTS idx_gatherings_date ON gatherings(gathering_date);
CREATE INDEX IF NOT EXISTS idx_gatherings_status ON gatherings(status);
CREATE INDEX IF NOT EXISTS idx_gatherings_creator ON gatherings(creator_id);

-- Перевірка та створення таблиці slots
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'slots') THEN
    CREATE TABLE slots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gathering_id UUID REFERENCES gatherings(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      slot_number INTEGER NOT NULL,
      booked_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(gathering_id, slot_number),
      UNIQUE(gathering_id, user_id)
    );
  END IF;
END $$;

-- Indexes для slots (якщо не існують)
CREATE INDEX IF NOT EXISTS idx_slots_gathering ON slots(gathering_id);
CREATE INDEX IF NOT EXISTS idx_slots_user ON slots(user_id);

-- Перевірка та створення таблиці waitlist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waitlist') THEN
    CREATE TABLE waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gathering_id UUID REFERENCES gatherings(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      position INTEGER NOT NULL,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(gathering_id, user_id)
    );
  END IF;
END $$;

-- Indexes для waitlist (якщо не існують)
CREATE INDEX IF NOT EXISTS idx_waitlist_gathering ON waitlist(gathering_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist(gathering_id, position);

-- Function для автопросування з черги (завжди оновлюємо)
CREATE OR REPLACE FUNCTION promote_from_waitlist() 
RETURNS TRIGGER AS $$
DECLARE
  next_user RECORD;
  free_slot_number INTEGER;
BEGIN
  -- Знайти вільний номер слоту
  SELECT COALESCE(MAX(slot_number), 0) + 1 INTO free_slot_number
  FROM slots WHERE gathering_id = OLD.gathering_id;
  
  -- Знайти першого в черзі
  SELECT * INTO next_user FROM waitlist 
  WHERE gathering_id = OLD.gathering_id 
  ORDER BY position ASC LIMIT 1;
  
  IF next_user IS NOT NULL THEN
    -- Створити слот
    INSERT INTO slots (gathering_id, user_id, slot_number)
    VALUES (OLD.gathering_id, next_user.user_id, free_slot_number);
    
    -- Видалити з черги
    DELETE FROM waitlist WHERE id = next_user.id;
    
    -- Оновити позиції в черзі
    UPDATE waitlist 
    SET position = position - 1
    WHERE gathering_id = OLD.gathering_id AND position > next_user.position;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger для автопросування (видаляємо старий якщо існує, створюємо новий)
DROP TRIGGER IF EXISTS on_slot_deleted ON slots;
CREATE TRIGGER on_slot_deleted
AFTER DELETE ON slots
FOR EACH ROW
EXECUTE FUNCTION promote_from_waitlist();

-- Function для перевірки доступних слотів перед бронюванням (завжди оновлюємо)
CREATE OR REPLACE FUNCTION check_available_slots(p_gathering_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  max_slots_count INTEGER;
  current_slots_count INTEGER;
BEGIN
  -- Отримати максимальну кількість слотів
  SELECT max_slots INTO max_slots_count
  FROM gatherings
  WHERE id = p_gathering_id;
  
  -- Порахувати поточні слоти
  SELECT COUNT(*) INTO current_slots_count
  FROM slots
  WHERE gathering_id = p_gathering_id;
  
  RETURN current_slots_count < max_slots_count;
END;
$$ LANGUAGE plpgsql;

-- RPC function для безпечного бронювання (завжди оновлюємо)
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
  
  -- Визначити номер нового слоту
  SELECT COALESCE(MAX(slot_number), 0) + 1 INTO v_new_slot_number
  FROM slots
  WHERE gathering_id = p_gathering_id;
  
  -- Створити слот
  INSERT INTO slots (gathering_id, user_id, slot_number)
  VALUES (p_gathering_id, p_user_id, v_new_slot_number);
  
  RETURN json_build_object(
    'success', true,
    'slot_number', v_new_slot_number
  );
END;
$$ LANGUAGE plpgsql;

-- RPC function для додавання в чергу (завжди оновлюємо)
CREATE OR REPLACE FUNCTION join_waitlist(
  p_gathering_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_next_position INTEGER;
BEGIN
  -- Перевірка чи користувач вже в черзі
  IF EXISTS (
    SELECT 1 FROM waitlist 
    WHERE gathering_id = p_gathering_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_in_waitlist'
    );
  END IF;
  
  -- Перевірка чи користувач вже має слот
  IF EXISTS (
    SELECT 1 FROM slots 
    WHERE gathering_id = p_gathering_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_has_slot'
    );
  END IF;
  
  -- Визначити позицію в черзі
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
  FROM waitlist
  WHERE gathering_id = p_gathering_id;
  
  -- Додати в чергу
  INSERT INTO waitlist (gathering_id, user_id, position)
  VALUES (p_gathering_id, p_user_id, v_next_position);
  
  RETURN json_build_object(
    'success', true,
    'position', v_next_position
  );
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies для profiles (видаляємо старі якщо існують, створюємо нові)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies для gatherings
DROP POLICY IF EXISTS "Gatherings are viewable by everyone" ON gatherings;
CREATE POLICY "Gatherings are viewable by everyone"
  ON gatherings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create gatherings" ON gatherings;
CREATE POLICY "Authenticated users can create gatherings"
  ON gatherings FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their own gatherings" ON gatherings;
CREATE POLICY "Creators can update their own gatherings"
  ON gatherings FOR UPDATE
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their own gatherings" ON gatherings;
CREATE POLICY "Creators can delete their own gatherings"
  ON gatherings FOR DELETE
  USING (auth.uid() = creator_id);

-- RLS Policies для slots
DROP POLICY IF EXISTS "Slots are viewable by everyone" ON slots;
CREATE POLICY "Slots are viewable by everyone"
  ON slots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can book slots for themselves" ON slots;
CREATE POLICY "Users can book slots for themselves"
  ON slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own slots" ON slots;
CREATE POLICY "Users can delete their own slots"
  ON slots FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies для waitlist
DROP POLICY IF EXISTS "Waitlist is viewable by everyone" ON waitlist;
CREATE POLICY "Waitlist is viewable by everyone"
  ON waitlist FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join waitlist for themselves" ON waitlist;
CREATE POLICY "Users can join waitlist for themselves"
  ON waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave their own waitlist position" ON waitlist;
CREATE POLICY "Users can leave their own waitlist position"
  ON waitlist FOR DELETE
  USING (auth.uid() = user_id);

