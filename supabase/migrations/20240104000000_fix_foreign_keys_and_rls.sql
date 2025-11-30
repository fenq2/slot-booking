-- Міграція для виправлення foreign key constraints та перевірки RLS
-- Безпечна для повторного запуску

-- Перевірити та створити foreign key для gatherings.creator_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gatherings_creator_id_fkey'
  ) THEN
    ALTER TABLE gatherings 
    ADD CONSTRAINT gatherings_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Перевірити та створити foreign key для slots.gathering_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'slots_gathering_id_fkey'
  ) THEN
    ALTER TABLE slots 
    ADD CONSTRAINT slots_gathering_id_fkey 
    FOREIGN KEY (gathering_id) REFERENCES gatherings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Перевірити та створити foreign key для slots.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'slots_user_id_fkey'
  ) THEN
    ALTER TABLE slots 
    ADD CONSTRAINT slots_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Перевірити та створити foreign key для waitlist.gathering_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'waitlist_gathering_id_fkey'
  ) THEN
    ALTER TABLE waitlist 
    ADD CONSTRAINT waitlist_gathering_id_fkey 
    FOREIGN KEY (gathering_id) REFERENCES gatherings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Перевірити та створити foreign key для waitlist.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'waitlist_user_id_fkey'
  ) THEN
    ALTER TABLE waitlist 
    ADD CONSTRAINT waitlist_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Переконатися що RLS увімкнено
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Переконатися що політики для читання існують та правильні
-- Profiles - читати можуть всі
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT 
  USING (true);

-- Gatherings - читати можуть всі
DROP POLICY IF EXISTS "Gatherings are viewable by everyone" ON gatherings;
CREATE POLICY "Gatherings are viewable by everyone"
  ON gatherings FOR SELECT 
  USING (true);

-- Slots - читати можуть всі
DROP POLICY IF EXISTS "Slots are viewable by everyone" ON slots;
CREATE POLICY "Slots are viewable by everyone"
  ON slots FOR SELECT 
  USING (true);

-- Waitlist - читати можуть всі
DROP POLICY IF EXISTS "Waitlist is viewable by everyone" ON waitlist;
CREATE POLICY "Waitlist is viewable by everyone"
  ON waitlist FOR SELECT 
  USING (true);

-- Додати політики для INSERT якщо не існують
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can create gatherings" ON gatherings;
CREATE POLICY "Authenticated users can create gatherings"
  ON gatherings FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can book slots for themselves" ON slots;
CREATE POLICY "Users can book slots for themselves"
  ON slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can join waitlist for themselves" ON waitlist;
CREATE POLICY "Users can join waitlist for themselves"
  ON waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Додати політики для UPDATE якщо не існують
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Creators can update their own gatherings" ON gatherings;
CREATE POLICY "Creators can update their own gatherings"
  ON gatherings FOR UPDATE
  USING (auth.uid() = creator_id);

-- Додати політики для DELETE якщо не існують
DROP POLICY IF EXISTS "Creators can delete their own gatherings" ON gatherings;
CREATE POLICY "Creators can delete their own gatherings"
  ON gatherings FOR DELETE
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete their own slots" ON slots;
CREATE POLICY "Users can delete their own slots"
  ON slots FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave their own waitlist position" ON waitlist;
CREATE POLICY "Users can leave their own waitlist position"
  ON waitlist FOR DELETE
  USING (auth.uid() = user_id);

