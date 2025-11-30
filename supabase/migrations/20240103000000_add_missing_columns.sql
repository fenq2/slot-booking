-- Міграція для додавання відсутніх колонок та оновлення структури
-- Безпечна для повторного запуску

-- Спочатку додаємо всі колонки, потім заповнюємо display_name

-- Додати колонку telegram_id якщо не існує
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'telegram_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN telegram_id BIGINT;
  END IF;
END $$;

-- Додати колонку telegram_username якщо не існує
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'telegram_username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN telegram_username TEXT;
  END IF;
END $$;

-- Додати колонку display_name до profiles якщо не існує
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name TEXT;
    -- Оновити існуючі записи (тепер telegram_username вже існує)
    UPDATE profiles 
    SET display_name = COALESCE(telegram_username, 'User ' || id::text)
    WHERE display_name IS NULL;
    -- Зробити NOT NULL після заповнення
    ALTER TABLE profiles ALTER COLUMN display_name SET NOT NULL;
  ELSE
    -- Якщо колонка вже існує, але є NULL значення, заповнити їх
    UPDATE profiles 
    SET display_name = COALESCE(telegram_username, 'User ' || id::text)
    WHERE display_name IS NULL;
  END IF;
END $$;

-- Додати колонку created_at якщо не існує
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Перевірити та додати обмеження UNIQUE для telegram_id якщо не існує
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_telegram_id_key'
  ) THEN
    -- Спочатку видалимо можливі дублікати
    DELETE FROM profiles p1
    WHERE EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.telegram_id = p1.telegram_id 
      AND p2.id < p1.id 
      AND p2.telegram_id IS NOT NULL
    );
    -- Додамо обмеження (тільки якщо немає дублікатів)
    BEGIN
      ALTER TABLE profiles ADD CONSTRAINT profiles_telegram_id_key UNIQUE (telegram_id);
    EXCEPTION WHEN others THEN
      -- Якщо є дублікати, просто пропускаємо додавання обмеження
      RAISE NOTICE 'Could not add unique constraint on telegram_id due to duplicates';
    END;
  END IF;
END $$;

-- Створити індекс для display_name якщо не існує
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Перевірити та створити таблицю gatherings якщо не існує
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
  ELSE
    -- Додати відсутні колонки до gatherings
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'gatherings' AND column_name = 'status'
    ) THEN
      ALTER TABLE gatherings ADD COLUMN status TEXT DEFAULT 'open';
      ALTER TABLE gatherings ADD CONSTRAINT gatherings_status_check 
        CHECK (status IN ('open', 'closed', 'cancelled'));
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'gatherings' AND column_name = 'booking_deadline'
    ) THEN
      ALTER TABLE gatherings ADD COLUMN booking_deadline TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- Створити індекси для gatherings якщо не існують
CREATE INDEX IF NOT EXISTS idx_gatherings_date ON gatherings(gathering_date);
CREATE INDEX IF NOT EXISTS idx_gatherings_status ON gatherings(status);
CREATE INDEX IF NOT EXISTS idx_gatherings_creator ON gatherings(creator_id);

-- Перевірити та створити таблицю slots якщо не існує
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
  ELSE
    -- Додати відсутні колонки
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'slots' AND column_name = 'booked_at'
    ) THEN
      ALTER TABLE slots ADD COLUMN booked_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Створити індекси для slots якщо не існують
CREATE INDEX IF NOT EXISTS idx_slots_gathering ON slots(gathering_id);
CREATE INDEX IF NOT EXISTS idx_slots_user ON slots(user_id);

-- Перевірити та створити таблицю waitlist якщо не існує
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
  ELSE
    -- Додати відсутні колонки
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'waitlist' AND column_name = 'joined_at'
    ) THEN
      ALTER TABLE waitlist ADD COLUMN joined_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Створити індекси для waitlist якщо не існують
CREATE INDEX IF NOT EXISTS idx_waitlist_gathering ON waitlist(gathering_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist(gathering_id, position);

-- Оновити функції (завжди оновлюємо)
CREATE OR REPLACE FUNCTION promote_from_waitlist() 
RETURNS TRIGGER AS $$
DECLARE
  next_user RECORD;
  free_slot_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(slot_number), 0) + 1 INTO free_slot_number
  FROM slots WHERE gathering_id = OLD.gathering_id;
  
  SELECT * INTO next_user FROM waitlist 
  WHERE gathering_id = OLD.gathering_id 
  ORDER BY position ASC LIMIT 1;
  
  IF next_user IS NOT NULL THEN
    INSERT INTO slots (gathering_id, user_id, slot_number)
    VALUES (OLD.gathering_id, next_user.user_id, free_slot_number);
    
    DELETE FROM waitlist WHERE id = next_user.id;
    
    UPDATE waitlist 
    SET position = position - 1
    WHERE gathering_id = OLD.gathering_id AND position > next_user.position;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_slot_deleted ON slots;
CREATE TRIGGER on_slot_deleted
AFTER DELETE ON slots
FOR EACH ROW
EXECUTE FUNCTION promote_from_waitlist();

CREATE OR REPLACE FUNCTION check_available_slots(p_gathering_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  max_slots_count INTEGER;
  current_slots_count INTEGER;
BEGIN
  SELECT max_slots INTO max_slots_count
  FROM gatherings
  WHERE id = p_gathering_id;
  
  SELECT COUNT(*) INTO current_slots_count
  FROM slots
  WHERE gathering_id = p_gathering_id;
  
  RETURN current_slots_count < max_slots_count;
END;
$$ LANGUAGE plpgsql;

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
  SELECT max_slots INTO v_max_slots
  FROM gatherings
  WHERE id = p_gathering_id
  FOR UPDATE;
  
  IF NOT EXISTS (
    SELECT 1 FROM gatherings 
    WHERE id = p_gathering_id 
    AND status = 'open'
    AND gathering_date > NOW()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'gathering_not_available');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM slots 
    WHERE gathering_id = p_gathering_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_booked');
  END IF;
  
  SELECT COUNT(*) INTO v_current_slots
  FROM slots
  WHERE gathering_id = p_gathering_id;
  
  IF v_current_slots >= v_max_slots THEN
    RETURN json_build_object('success', false, 'error', 'no_slots_available');
  END IF;
  
  SELECT COALESCE(
    (SELECT s.slot_num
     FROM generate_series(1, v_max_slots) AS s(slot_num)
     LEFT JOIN slots sl ON sl.gathering_id = p_gathering_id AND sl.slot_number = s.slot_num
     WHERE sl.id IS NULL
     ORDER BY s.slot_num
     LIMIT 1),
    (SELECT COALESCE(MAX(slot_number), 0) + 1
     FROM slots
     WHERE gathering_id = p_gathering_id)
  ) INTO v_new_slot_number;
  
  INSERT INTO slots (gathering_id, user_id, slot_number)
  VALUES (p_gathering_id, p_user_id, v_new_slot_number);
  
  RETURN json_build_object('success', true, 'slot_number', v_new_slot_number);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION join_waitlist(
  p_gathering_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_next_position INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM waitlist 
    WHERE gathering_id = p_gathering_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_in_waitlist');
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM slots 
    WHERE gathering_id = p_gathering_id AND user_id = p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_has_slot');
  END IF;
  
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
  FROM waitlist
  WHERE gathering_id = p_gathering_id;
  
  INSERT INTO waitlist (gathering_id, user_id, position)
  VALUES (p_gathering_id, p_user_id, v_next_position);
  
  RETURN json_build_object('success', true, 'position', v_next_position);
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies для profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

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
  ON gatherings FOR SELECT USING (true);

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
  ON slots FOR SELECT USING (true);

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
  ON waitlist FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join waitlist for themselves" ON waitlist;
CREATE POLICY "Users can join waitlist for themselves"
  ON waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave their own waitlist position" ON waitlist;
CREATE POLICY "Users can leave their own waitlist position"
  ON waitlist FOR DELETE
  USING (auth.uid() = user_id);

