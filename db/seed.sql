insert into profiles (id, email, display_name, preferred_language, theme)
values ('11111111-1111-1111-1111-111111111111','demo@lexinote.app','Demo User','de','cozy')
on conflict (id) do nothing;

insert into decks (id, user_id, name, description, color, is_default)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','My First Deck','Starter vocabulary deck','#F3C98B',true)
on conflict (id) do nothing;
