-- Removing a player must not remove settlement history or block roster deletion.
ALTER TABLE public.match_results DROP CONSTRAINT IF EXISTS match_results_player1_id_fkey;
ALTER TABLE public.match_results DROP CONSTRAINT IF EXISTS match_results_player2_id_fkey;
ALTER TABLE public.match_results DROP CONSTRAINT IF EXISTS match_results_winner_id_fkey;
ALTER TABLE public.match_results ADD CONSTRAINT match_results_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.match_results ADD CONSTRAINT match_results_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.match_results ADD CONSTRAINT match_results_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
