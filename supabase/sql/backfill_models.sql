-- Backfill missing model values by combining brand and name
update assets
set model = concat(brand, ' ', name)
where (model is null or model = '')
  and brand is not null
  and name is not null;