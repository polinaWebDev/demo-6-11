-- Fix typo in Course enum: 'alorithms' -> 'algorithms' (existing rows are updated automatically)
ALTER TYPE "Course" RENAME VALUE 'alorithms' TO 'algorithms';
