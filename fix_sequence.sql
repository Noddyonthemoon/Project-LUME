SELECT setval(pg_get_serial_sequence('safety_audits', 'id'), coalesce(max(id),0) + 1, false) FROM safety_audits;
