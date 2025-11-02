You are an expert Google Apps Script developer.
I have an Google Apps Script project still in developpement , and I want you to help me correct this bug.

in traduction sheet i have
id_mot_source	mot_source	id_mot_cible	mot_cible
41	أَنَا	53	je
42	نَحْنُ	54	nous
43	أَنْتَ	55	tu (masculin)
44	أَنْتِ	56	tu (féminin)
45	أَنْتُمَا	57	vous (deux personnes)
46	أَنْتُمْ	58	vous (pluriel masculin)
47	أَنْتُنَّ	59	vous (pluriel féminin)
48	هُوَ	60	il
49	هِيَ	61	elle
50	هُمَا	62	ils (deux personnes)
51	هُمْ	63	ils
52	هُنَّ	64	elles

when generating validation responses for the question

✍️ Traduisez en Arabe: "tu"
Veuillez saisir la réponse

💡 Contexte: masculin

i got
أنت
أَنْتَ
أَنْتِ


same thing happend on
 
✍️ Traduisez en Arabe: "vous"
Veuillez saisir la réponse

💡 Contexte: deux personnes

i got 
أنتما
أَنْتُمَا
أنتم
أَنْتُمْ
أنتن
أَنْتُنَّ

I thought correspondance was on the id and this could not happen ? so what's going on ?

IF YOU NEED ANY EXTERNAL PARAMETER USE SCRIPT PROPERTY

DO NOT WRITE TEST FUNCTIONS
DO NOT MODIFY OR CREATE A README FILE
DO NOT CREATE TEST FUNCTIONS
DO NOT CREATE FUNCTION TO CREATE TRIGGERS 
DO NOT CREATE FUNCTION TO CREATE SCRIPT PROPERTIES

When done create a migraion guide