-- ── avatar_style ──────────────────────────────────────────────────────────────
INSERT INTO avatar_style (id, nombre) VALUES
  (2, 'notionist');

-- ── atributo_avatar ───────────────────────────────────────────────────────────
INSERT INTO atributo_avatar (id, nombre, id_avatar_style, nombre_es) VALUES
  (23, 'beard'                       , 2, 'barba'),
  (24, 'clothing'                    , 2, 'ropa'),
  (25, 'clothingGraphic'             , 2, 'graficoRopa'),
  (26, 'eyebrows'                    , 2, 'cejas'),
  (27, 'eyes'                        , 2, 'ojos'),
  (28, 'gesture'                     , 2, 'gesto'),
  (29, 'glasses'                     , 2, 'gafas'),
  (30, 'hair'                        , 2, 'cabello'),
  (31, 'head'                        , 2, 'cabeza'),
  (32, 'mouth'                       , 2, 'boca'),
  (33, 'nose'                        , 2, 'nariz'),
  (34, 'backgroundColor'             , 2, 'colorFondo'),
  (35, 'beardProbability'            , 2, 'probabilidadBarba'),
  (37, 'clothingGraphicProbability'  , 2, 'probabilidadGraficoRopa'),
  (40, 'gestureProbability'          , 2, 'probabilidadGesto'),
  (41, 'glassesProbability'          , 2, 'probabilidadGafas'),
  (42, 'hairProbability'             , 2, 'probabilidadCabello'),
  (43, 'mouthProbability'            , 2, 'probabilidadBoca');

-- ── elemento_inventario_avatar ────────────────────────────────────────────────
INSERT INTO elemento_inventario_avatar (id, nombre, id_atributo_avatar, nombre_es) VALUES
  -- beard (id_atributo_avatar: 23)
  (215, 'variant01'         ,   23, 'variante01'),
  (216, 'variant02'         ,   23, 'variante02'),
  (217, 'variant03'         ,   23, 'variante03'),
  (218, 'variant04'         ,   23, 'variante04'),
  (219, 'variant05'         ,   23, 'variante05'),
  (220, 'variant06'         ,   23, 'variante06'),
  (221, 'variant07'         ,   23, 'variante07'),
  (222, 'variant08'         ,   23, 'variante08'),
  (223, 'variant09'         ,   23, 'variante09'),
  (224, 'variant10'         ,   23, 'variante10'),
  (225, 'variant11'         ,   23, 'variante11'),
  (226, 'variant12'         ,   23, 'variante12'),

  -- clothing (id_atributo_avatar: 24)
  (227, 'variant01'         ,   24, 'variante01'),
  (228, 'variant02'         ,   24, 'variante02'),
  (229, 'variant03'         ,   24, 'variante03'),
  (230, 'variant04'         ,   24, 'variante04'),
  (231, 'variant05'         ,   24, 'variante05'),
  (232, 'variant06'         ,   24, 'variante06'),
  (233, 'variant07'         ,   24, 'variante07'),
  (234, 'variant08'         ,   24, 'variante08'),
  (235, 'variant09'         ,   24, 'variante09'),
  (236, 'variant10'         ,   24, 'variante10'),
  (237, 'variant11'         ,   24, 'variante11'),
  (238, 'variant12'         ,   24, 'variante12'),
  (239, 'variant13'         ,   24, 'variante13'),
  (240, 'variant14'         ,   24, 'variante14'),
  (241, 'variant15'         ,   24, 'variante15'),
  (242, 'variant16'         ,   24, 'variante16'),
  (243, 'variant17'         ,   24, 'variante17'),
  (244, 'variant18'         ,   24, 'variante18'),
  (245, 'variant19'         ,   24, 'variante19'),
  (246, 'variant20'         ,   24, 'variante20'),
  (247, 'variant21'         ,   24, 'variante21'),
  (248, 'variant22'         ,   24, 'variante22'),
  (249, 'variant23'         ,   24, 'variante23'),
  (250, 'variant24'         ,   24, 'variante24'),
  (251, 'variant25'         ,   24, 'variante25'),

  -- clothingGraphic (id_atributo_avatar: 25)
  (252, 'electric'          ,   25, 'electrico'),
  (253, 'galaxy'            ,   25, 'galaxia'),
  (254, 'saturn'            ,   25, 'saturno'),

  -- eyebrows (id_atributo_avatar: 26)
  (255, 'variant01'         ,   26, 'variante01'),
  (256, 'variant02'         ,   26, 'variante02'),
  (257, 'variant03'         ,   26, 'variante03'),
  (258, 'variant04'         ,   26, 'variante04'),
  (259, 'variant05'         ,   26, 'variante05'),
  (260, 'variant06'         ,   26, 'variante06'),
  (261, 'variant07'         ,   26, 'variante07'),
  (262, 'variant08'         ,   26, 'variante08'),
  (263, 'variant09'         ,   26, 'variante09'),
  (264, 'variant10'         ,   26, 'variante10'),
  (265, 'variant11'         ,   26, 'variante11'),
  (266, 'variant12'         ,   26, 'variante12'),
  (267, 'variant13'         ,   26, 'variante13'),

  -- eyes (id_atributo_avatar: 27)
  (268, 'variant01'         ,   27, 'variante01'),
  (269, 'variant02'         ,   27, 'variante02'),
  (270, 'variant03'         ,   27, 'variante03'),
  (271, 'variant04'         ,   27, 'variante04'),
  (272, 'variant05'         ,   27, 'variante05'),

  -- gesture (id_atributo_avatar: 28)
  (273, 'hand'              ,   28, 'mano'),
  (274, 'handPhone'         ,   28, 'manoTelefono'),
  (275, 'ok'                ,   28, 'ok'),
  (276, 'okLongArm'         ,   28, 'okBrazoLargo'),
  (277, 'point'             ,   28, 'senalar'),
  (278, 'pointLongArm'      ,   28, 'senalarBrazoLargo'),
  (279, 'waveLongArm'       ,   28, 'saludarBrazoLargo'),
  (280, 'waveLongArms'      ,   28, 'saludarBrazosLargos'),
  (281, 'waveOkLongArms'    ,   28, 'saludarOkBrazosLargos'),
  (282, 'wavePointLongArms' ,   28, 'saludarSenalarBrazosLargos'),

  -- glasses (id_atributo_avatar: 29)
  (283, 'variant01'         ,   29, 'variante01'),
  (284, 'variant02'         ,   29, 'variante02'),
  (285, 'variant03'         ,   29, 'variante03'),
  (286, 'variant04'         ,   29, 'variante04'),
  (287, 'variant05'         ,   29, 'variante05'),
  (288, 'variant06'         ,   29, 'variante06'),
  (289, 'variant07'         ,   29, 'variante07'),
  (290, 'variant08'         ,   29, 'variante08'),
  (291, 'variant09'         ,   29, 'variante09'),
  (292, 'variant10'         ,   29, 'variante10'),
  (293, 'variant11'         ,   29, 'variante11'),

  -- hair (id_atributo_avatar: 30)
  (294, 'hat'               ,   30, 'sombrero'),
  (295, 'variant01'         ,   30, 'variante01'),
  (296, 'variant02'         ,   30, 'variante02'),
  (297, 'variant03'         ,   30, 'variante03'),
  (298, 'variant04'         ,   30, 'variante04'),
  (299, 'variant05'         ,   30, 'variante05'),
  (300, 'variant06'         ,   30, 'variante06'),
  (301, 'variant07'         ,   30, 'variante07'),
  (302, 'variant08'         ,   30, 'variante08'),
  (303, 'variant09'         ,   30, 'variante09'),
  (304, 'variant10'         ,   30, 'variante10'),
  (305, 'variant11'         ,   30, 'variante11'),
  (306, 'variant12'         ,   30, 'variante12'),
  (307, 'variant13'         ,   30, 'variante13'),
  (308, 'variant14'         ,   30, 'variante14'),
  (309, 'variant15'         ,   30, 'variante15'),
  (310, 'variant16'         ,   30, 'variante16'),
  (311, 'variant17'         ,   30, 'variante17'),
  (312, 'variant18'         ,   30, 'variante18'),
  (313, 'variant19'         ,   30, 'variante19'),
  (314, 'variant20'         ,   30, 'variante20'),
  (315, 'variant21'         ,   30, 'variante21'),
  (316, 'variant22'         ,   30, 'variante22'),
  (317, 'variant23'         ,   30, 'variante23'),
  (318, 'variant24'         ,   30, 'variante24'),
  (319, 'variant25'         ,   30, 'variante25'),
  (320, 'variant26'         ,   30, 'variante26'),
  (321, 'variant27'         ,   30, 'variante27'),
  (322, 'variant28'         ,   30, 'variante28'),
  (323, 'variant29'         ,   30, 'variante29'),
  (324, 'variant30'         ,   30, 'variante30'),
  (325, 'variant31'         ,   30, 'variante31'),
  (326, 'variant32'         ,   30, 'variante32'),
  (327, 'variant33'         ,   30, 'variante33'),
  (328, 'variant34'         ,   30, 'variante34'),
  (329, 'variant35'         ,   30, 'variante35'),
  (330, 'variant36'         ,   30, 'variante36'),
  (331, 'variant37'         ,   30, 'variante37'),
  (332, 'variant38'         ,   30, 'variante38'),
  (333, 'variant39'         ,   30, 'variante39'),
  (334, 'variant40'         ,   30, 'variante40'),
  (335, 'variant41'         ,   30, 'variante41'),
  (336, 'variant42'         ,   30, 'variante42'),
  (337, 'variant43'         ,   30, 'variante43'),
  (338, 'variant44'         ,   30, 'variante44'),
  (339, 'variant45'         ,   30, 'variante45'),
  (340, 'variant46'         ,   30, 'variante46'),
  (341, 'variant47'         ,   30, 'variante47'),
  (342, 'variant48'         ,   30, 'variante48'),
  (343, 'variant49'         ,   30, 'variante49'),
  (344, 'variant50'         ,   30, 'variante50'),
  (345, 'variant51'         ,   30, 'variante51'),
  (346, 'variant52'         ,   30, 'variante52'),
  (347, 'variant53'         ,   30, 'variante53'),
  (348, 'variant54'         ,   30, 'variante54'),
  (349, 'variant55'         ,   30, 'variante55'),
  (350, 'variant56'         ,   30, 'variante56'),
  (351, 'variant57'         ,   30, 'variante57'),
  (352, 'variant58'         ,   30, 'variante58'),
  (353, 'variant59'         ,   30, 'variante59'),
  (354, 'variant60'         ,   30, 'variante60'),
  (355, 'variant61'         ,   30, 'variante61'),
  (356, 'variant62'         ,   30, 'variante62'),
  (357, 'variant63'         ,   30, 'variante63'),

  -- head (id_atributo_avatar: 31)
  (358, 'variant01'         ,   31, 'variante01'),

  -- mouth (id_atributo_avatar: 32)
  (359, 'variant01'         ,   32, 'variante01'),
  (360, 'variant02'         ,   32, 'variante02'),
  (361, 'variant03'         ,   32, 'variante03'),
  (362, 'variant04'         ,   32, 'variante04'),
  (363, 'variant05'         ,   32, 'variante05'),
  (364, 'variant06'         ,   32, 'variante06'),
  (365, 'variant07'         ,   32, 'variante07'),
  (366, 'variant08'         ,   32, 'variante08'),
  (367, 'variant09'         ,   32, 'variante09'),
  (368, 'variant10'         ,   32, 'variante10'),
  (369, 'variant11'         ,   32, 'variante11'),
  (370, 'variant12'         ,   32, 'variante12'),
  (371, 'variant13'         ,   32, 'variante13'),
  (372, 'variant14'         ,   32, 'variante14'),
  (373, 'variant15'         ,   32, 'variante15'),
  (374, 'variant16'         ,   32, 'variante16'),
  (375, 'variant17'         ,   32, 'variante17'),
  (376, 'variant18'         ,   32, 'variante18'),
  (377, 'variant19'         ,   32, 'variante19'),
  (378, 'variant20'         ,   32, 'variante20'),
  (379, 'variant21'         ,   32, 'variante21'),
  (380, 'variant22'         ,   32, 'variante22'),
  (381, 'variant23'         ,   32, 'variante23'),
  (382, 'variant24'         ,   32, 'variante24'),
  (383, 'variant25'         ,   32, 'variante25'),
  (384, 'variant26'         ,   32, 'variante26'),
  (385, 'variant27'         ,   32, 'variante27'),
  (386, 'variant28'         ,   32, 'variante28'),
  (387, 'variant29'         ,   32, 'variante29'),
  (388, 'variant30'         ,   32, 'variante30'),

  -- nose (id_atributo_avatar: 33)
  (389, 'variant01'         ,   33, 'variante01'),
  (390, 'variant02'         ,   33, 'variante02'),
  (391, 'variant03'         ,   33, 'variante03'),
  (392, 'variant04'         ,   33, 'variante04'),
  (393, 'variant05'         ,   33, 'variante05'),
  (394, 'variant06'         ,   33, 'variante06'),
  (395, 'variant07'         ,   33, 'variante07'),
  (396, 'variant08'         ,   33, 'variante08'),
  (397, 'variant09'         ,   33, 'variante09'),
  (398, 'variant10'         ,   33, 'variante10'),
  (399, 'variant11'         ,   33, 'variante11'),
  (400, 'variant12'         ,   33, 'variante12'),
  (401, 'variant13'         ,   33, 'variante13'),
  (402, 'variant14'         ,   33, 'variante14'),
  (403, 'variant15'         ,   33, 'variante15'),
  (404, 'variant16'         ,   33, 'variante16'),
  (405, 'variant17'         ,   33, 'variante17'),
  (406, 'variant18'         ,   33, 'variante18'),
  (407, 'variant19'         ,   33, 'variante19'),
  (408, 'variant20'         ,   33, 'variante20'),

  -- backgroundColor (id_atributo_avatar: 34)
  (409, 'b6e3f4'            ,   34, 'b6e3f4'),
  (410, 'c0aede'            ,   34, 'c0aede'),
  (411, 'd1d4f9'            ,   34, 'd1d4f9'),
  (412, 'ffd5dc'            ,   34, 'ffd5dc'),
  (413, 'ffdfbf'            ,   34, 'ffdfbf'),
  (414, 'transparent'       ,   34, 'transparente');


-- ══════════════════════════════════════════════════════════════════════════════
-- MINIAVS
-- ══════════════════════════════════════════════════════════════════════════════

-- ── avatar_style ──────────────────────────────────────────────────────────────
INSERT INTO avatar_style (id, nombre) VALUES
  (3, 'miniavs');

-- ── atributo_avatar ───────────────────────────────────────────────────────────
INSERT INTO atributo_avatar (id, nombre, id_avatar_style, nombre_es) VALUES
  (45, 'blush'                       , 3, 'rubor'),
  (46, 'body'                        , 3, 'cuerpo'),
  (47, 'bodyColor'                   , 3, 'colorCuerpo'),
  (48, 'eyes'                        , 3, 'ojos'),
  (49, 'glasses'                     , 3, 'gafas'),
  (50, 'hair'                        , 3, 'cabello'),
  (51, 'hairColor'                   , 3, 'colorCabello'),
  (52, 'head'                        , 3, 'cabeza'),
  (53, 'mouth'                       , 3, 'boca'),
  (54, 'mustache'                    , 3, 'bigote'),
  (55, 'skinColor'                   , 3, 'colorPiel'),
  (56, 'blushProbability'            , 3, 'probabilidadRubor'),
  (57, 'bodyProbability'             , 3, 'probabilidadCuerpo'),
  (58, 'glassesProbability'          , 3, 'probabilidadGafas'),
  (59, 'hairProbability'             , 3, 'probabilidadCabello'),
  (60, 'mustacheProbability'         , 3, 'probabilidadBigote');

-- ── elemento_inventario_avatar ────────────────────────────────────────────────
INSERT INTO elemento_inventario_avatar (id, nombre, id_atributo_avatar, nombre_es) VALUES
  -- blush (id_atributo_avatar: 45)
  (415, 'default'           ,   45, 'predeterminado'),

  -- body (id_atributo_avatar: 46)
  (416, 'golf'              ,   46, 'golf'),
  (417, 'tShirt'            ,   46, 'camiseta'),

  -- bodyColor (id_atributo_avatar: 47)
  (418, '00b159'            ,   47, '00b159'),
  (419, '03396c'            ,   47, '03396c'),
  (420, '428bca'            ,   47, '428bca'),
  (421, '44c585'            ,   47, '44c585'),
  (422, '5bc0de'            ,   47, '5bc0de'),
  (423, '88d8b0'            ,   47, '88d8b0'),
  (424, 'ae0001'            ,   47, 'ae0001'),
  (425, 'd11141'            ,   47, 'd11141'),
  (426, 'ff6f69'            ,   47, 'ff6f69'),
  (427, 'ffc425'            ,   47, 'ffc425'),
  (428, 'ffd969'            ,   47, 'ffd969'),
  (429, 'ffeead'            ,   47, 'ffeead'),
  (430, 'transparent'       ,   47, 'transparente'),

  -- eyes (id_atributo_avatar: 48)
  (431, 'confident'         ,   48, 'confiado'),
  (432, 'happy'             ,   48, 'feliz'),
  (433, 'normal'            ,   48, 'normal'),

  -- glasses (id_atributo_avatar: 49)
  (434, 'normal'            ,   49, 'normal'),

  -- hair (id_atributo_avatar: 50)
  (435, 'balndess'          ,   50, 'calvicie'),
  (436, 'classic01'         ,   50, 'clasico01'),
  (437, 'classic02'         ,   50, 'clasico02'),
  (438, 'curly'             ,   50, 'rizado'),
  (439, 'elvis'             ,   50, 'elvis'),
  (440, 'long'              ,   50, 'largo'),
  (441, 'ponyTail'          ,   50, 'coleta'),
  (442, 'slaughter'         ,   50, 'slaughter'),
  (443, 'stylish'           ,   50, 'estilizado'),

  -- hairColor (id_atributo_avatar: 51)
  (444, '009bbd'            ,   51, '009bbd'),
  (445, '28150a'            ,   51, '28150a'),
  (446, '603015'            ,   51, '603015'),
  (447, '603a14'            ,   51, '603a14'),
  (448, '611c17'            ,   51, '611c17'),
  (449, '612616'            ,   51, '612616'),
  (450, '83623b'            ,   51, '83623b'),
  (451, '91cb15'            ,   51, '91cb15'),
  (452, 'a78961'            ,   51, 'a78961'),
  (453, 'bd1700'            ,   51, 'bd1700'),
  (454, 'cab188'            ,   51, 'cab188'),
  (455, 'transparent'       ,   51, 'transparente'),

  -- head (id_atributo_avatar: 52)
  (456, 'normal'            ,   52, 'normal'),
  (457, 'thin'              ,   52, 'delgada'),
  (458, 'wide'              ,   52, 'ancha'),

  -- mouth (id_atributo_avatar: 53)
  (459, 'default'           ,   53, 'predeterminado'),
  (460, 'missingTooth'      ,   53, 'dienteRoto'),

  -- mustache (id_atributo_avatar: 54)
  (461, 'freddy'            ,   54, 'freddy'),
  (462, 'horshoe'           ,   54, 'herradura'),
  (463, 'pencilThin'        ,   54, 'lapizDelgado'),
  (464, 'pencilThinBeard'   ,   54, 'lapizDelgadoBarba'),

  -- skinColor (id_atributo_avatar: 55)
  (465, 'b6e3f4'            ,   55, 'b6e3f4'),
  (466, 'c0aede'            ,   55, 'c0aede'),
  (467, 'd1d4f9'            ,   55, 'd1d4f9'),
  (468, 'ffd5dc'            ,   55, 'ffd5dc'),
  (469, 'ffdfbf'            ,   55, 'ffdfbf'),
  (470, 'transparent'       ,   55, 'transparente');