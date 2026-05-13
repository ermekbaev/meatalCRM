-- Добавляем статус "Готово" между "В работе" и "Завершена"
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'READY' AFTER 'IN_PROGRESS';
