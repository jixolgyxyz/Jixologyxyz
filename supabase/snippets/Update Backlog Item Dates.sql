UPDATE backlog_item
SET
  fecha_creacion    =  fecha_creacion    + shift.amount,
  fecha_vencimiento = (fecha_vencimiento + shift.amount)::date,
  fecha_completado  =  fecha_completado  + shift.amount
FROM (SELECT INTERVAL '7 days' AS amount) AS shift;
