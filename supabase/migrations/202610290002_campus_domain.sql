-- Campus domain confirmed by the project owner.
insert into private.approved_email_domains(domain)
values ('ua.edu.ph')
on conflict (domain) do nothing;
