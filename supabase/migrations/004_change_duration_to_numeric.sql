-- Change duration_minutes from INTEGER to NUMERIC to support decimal values
-- This allows storing precise video durations like 4.78950265 minutes
ALTER TABLE lessons
ALTER COLUMN duration_minutes TYPE NUMERIC(10, 2);
