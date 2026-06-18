--
-- PostgreSQL database dump
--

\restrict MOlK90hTAxvfTHpJVedBAYeTfrbfhugOY3LKmSCWtoLZM3Un2NdYWuZRnCj08jS

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: kana22
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    session_id character varying(255),
    device character varying(255),
    session_expires_at timestamp with time zone,
    google_id character varying(255),
    is_paid boolean DEFAULT false,
    payment_status character varying(50) DEFAULT 'unpaid'::character varying,
    payment_id character varying(255),
    last_login_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO kana22;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: kana22
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO kana22;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kana22
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: kana22
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: kana22
--

COPY public.users (id, email, password_hash, role, created_at, session_id, device, session_expires_at, google_id, is_paid, payment_status, payment_id, last_login_at) FROM stdin;
4	hantubanyu634@gmail.com	$2a$10$5DLh1CzUL5UnJ.lLdn3RTOLLxIL4ZBw.R.76OhXAXL43Oq/YEsvZK	user	2026-04-11 11:26:53.477987	\N	\N	\N	\N	f	unpaid	\N	2026-06-18 02:34:29.46346+00
16	juliagreenteacream@gmail.com	$2a$10$ooiIN.Ctil0XpyBVT0BetuP7XKuWW.OHMF7eY8/2buHpgy8nt4H7y	user	2026-06-12 10:43:12.820708	\N	\N	\N	\N	f	unpaid	\N	\N
15	gazali.ry@gmail.com	$2a$10$2RAUXEUo1/bqCrYGfo9pX.5IO41Np0PcKkcBZICo1RTmai3ESCTxi	user	2026-06-12 10:22:13.676616	\N	\N	\N	\N	f	unpaid	\N	2026-06-18 02:06:24.234411+00
5	buatgame922@gmail.com	$2a$10$Cf5n042J0CKF.NRjBMSn3.Fkt2Z3.iXZKr2auN.yFOeMwLLEF2422	user	2026-04-11 11:58:04.26662	dee1ec56c5a31c9d7dd2095e110d4ef8	Windows 10/11 · Chrome	2026-06-17 03:59:32.064185+00	\N	f	unpaid	\N	2026-06-17 00:59:32.064185+00
12	akmalratna24@gmail.com	$2a$10$lxBr8dxHsZ8Kn5qkLFsXy.KvNeIrv6S1xlYS0ndBSDa8d3f0Triry	user	2026-06-09 20:18:01.33785	bfd37462e3a12ed0bbc2f9ec45a0a259	K · Android 10	2026-06-09 15:25:12.999581+00	\N	f	unpaid	\N	\N
8	a@a.a	$2a$10$RoMwcZUDzdzGQfztSz5wpehw98.7./rvGD/5AFScx7d4.VhafvwtW	user	2026-04-29 21:44:16.494165	5fba40bafa353950f8d435f50b005923	Windows 10/11 · Chrome	2026-06-17 20:25:52.465181+00	\N	f	unpaid	\N	2026-06-17 17:25:52.46663+00
14	ssugiono@yahoo.com	$2a$10$Wh47E5dHAg50naYOMx4aXOaF/GMu7ZQekx3mxJQdh1VtN1hAk8vmG	user	2026-06-12 10:17:36.230556	\N	\N	\N	\N	f	unpaid	\N	\N
17	ibnu@gmail.com	$2a$10$kUGAZSXjJU70k0mXsR1bFeJ.fnz9W6BfsTbLcGdPzTwApP8hP2Czu	user	2026-06-12 11:18:50.820107	a84be18f3241fb5c3c4ef993780badf0	Linux · Chrome	2026-06-17 04:21:27.922914+00	\N	f	unpaid	\N	2026-06-17 01:21:27.923623+00
13	maria.officegpe@gmail.com	$2a$10$nfpRFPuzrmn//Pqg88lcQ.Kw4qwiDPDHSpZm7/hrV.ulBSo2xFmzm	user	2026-06-12 10:10:16.017955	fdc0a802cf172201039dfb7547f5ce70	K · Android 10	2026-06-15 19:14:48.113666+00	\N	f	unpaid	\N	2026-06-13 21:45:12.180066+00
7	ejaaww@gmail.com	$2a$10$5tkwlXq3BwqT1bUEmMvlJOTvOKXm5ohGiQZl4kjqRMHHDzEAuo7Mi	user	2026-04-11 18:38:46.978679	e660f9b8be832b51d3a2483a71b600b0	Windows 10/11 · Chrome	2026-06-17 20:47:39.077324+00	\N	t	paid	\N	2026-06-17 17:47:39.078352+00
18	gandi@gmail.com	$2a$10$OULCCx3llj57PaY4w2Sr7eNaM99M0fEgbgANXLnH2R94jZ/rG9xya	user	2026-06-16 08:26:41.419912	\N	\N	\N	\N	f	unpaid	\N	2026-06-17 05:41:36.357314+00
2	kana@gmail.com	$2a$10$93qeluvqG5WlSjatGtURbObnd1APbjHuruqT6cRZ/PaQRauCiqEn2	user	2026-04-11 09:15:49.42839	0fc091b63679e3b20ce5c1f7258551f2	Windows 10/11 · Chrome	2026-06-18 05:21:35.287608+00	\N	f	unpaid	\N	2026-06-18 02:21:35.28912+00
1	kalamaninzola@gmail.com	$2a$10$lTdNcGhX0Ofo5Ap5FZetTOxhp3rgzOKu4PT.JMstMxLMPutscQ62q	super_admin	2026-04-10 11:01:38.950613	\N	\N	\N	\N	f	unpaid	\N	2026-06-18 06:47:24.787655+00
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kana22
--

SELECT pg_catalog.setval('public.users_id_seq', 19, true);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: kana22
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: kana22
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: kana22
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict MOlK90hTAxvfTHpJVedBAYeTfrbfhugOY3LKmSCWtoLZM3Un2NdYWuZRnCj08jS

