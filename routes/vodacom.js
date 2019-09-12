const express = require('express');
const axios = require('axios');
const router = express.Router();
const CronJob = require('cron').CronJob;
let traffic_rates = [
    {
      "Date": "8/23/2019",
      "Time": "12:01:00 AM",
      "Inbound Traffic Rate": 3.75684,
      "Outbound Traffic Rate": 1438.630016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.26114011
    },
    {
      "Date": "8/23/2019",
      "Time": "12:06:00 AM",
      "Inbound Traffic Rate": 3.36027,
      "Outbound Traffic Rate": 1347.510016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.249368833
    },
    {
      "Date": "8/23/2019",
      "Time": "12:11:00 AM",
      "Inbound Traffic Rate": 3.53667,
      "Outbound Traffic Rate": 1348.290048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.262307803
    },
    {
      "Date": "8/23/2019",
      "Time": "12:16:00 AM",
      "Inbound Traffic Rate": 3.58221,
      "Outbound Traffic Rate": 1378.409984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.259879865
    },
    {
      "Date": "8/23/2019",
      "Time": "12:21:00 AM",
      "Inbound Traffic Rate": 3.70262,
      "Outbound Traffic Rate": 1382.370048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.267845792
    },
    {
      "Date": "8/23/2019",
      "Time": "12:26:00 AM",
      "Inbound Traffic Rate": 3.67605,
      "Outbound Traffic Rate": 1282,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.28674337
    },
    {
      "Date": "8/23/2019",
      "Time": "12:31:00 AM",
      "Inbound Traffic Rate": 3.71829,
      "Outbound Traffic Rate": 1259.820032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.295144537
    },
    {
      "Date": "8/23/2019",
      "Time": "12:36:00 AM",
      "Inbound Traffic Rate": 3.17205,
      "Outbound Traffic Rate": 1249.890048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.253786323
    },
    {
      "Date": "8/23/2019",
      "Time": "12:41:00 AM",
      "Inbound Traffic Rate": 3.1881,
      "Outbound Traffic Rate": 1303.6,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.244561215
    },
    {
      "Date": "8/23/2019",
      "Time": "12:46:00 AM",
      "Inbound Traffic Rate": 3.12484,
      "Outbound Traffic Rate": 1198.759936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.260672709
    },
    {
      "Date": "8/23/2019",
      "Time": "12:51:00 AM",
      "Inbound Traffic Rate": 3.0049,
      "Outbound Traffic Rate": 1165.229952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.257880429
    },
    {
      "Date": "8/23/2019",
      "Time": "12:56:00 AM",
      "Inbound Traffic Rate": 3.10154,
      "Outbound Traffic Rate": 1162.930048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.266700478
    },
    {
      "Date": "8/23/2019",
      "Time": "1:01:00 AM",
      "Inbound Traffic Rate": 3.30015,
      "Outbound Traffic Rate": 1182.96,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.27897393
    },
    {
      "Date": "8/23/2019",
      "Time": "1:06:00 AM",
      "Inbound Traffic Rate": 4.27289,
      "Outbound Traffic Rate": 1171.539968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.364724219
    },
    {
      "Date": "8/23/2019",
      "Time": "1:11:00 AM",
      "Inbound Traffic Rate": 4.55499,
      "Outbound Traffic Rate": 1207.939968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.377087448
    },
    {
      "Date": "8/23/2019",
      "Time": "1:16:00 AM",
      "Inbound Traffic Rate": 4.28432,
      "Outbound Traffic Rate": 1195.410048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.358397523
    },
    {
      "Date": "8/23/2019",
      "Time": "1:21:00 AM",
      "Inbound Traffic Rate": 4.11669,
      "Outbound Traffic Rate": 1184.16,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.347646433
    },
    {
      "Date": "8/23/2019",
      "Time": "1:26:00 AM",
      "Inbound Traffic Rate": 3.513,
      "Outbound Traffic Rate": 1225.549952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.286646823
    },
    {
      "Date": "8/23/2019",
      "Time": "1:31:00 AM",
      "Inbound Traffic Rate": 3.5748,
      "Outbound Traffic Rate": 1239.330048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.288446165
    },
    {
      "Date": "8/23/2019",
      "Time": "1:36:00 AM",
      "Inbound Traffic Rate": 3.66857,
      "Outbound Traffic Rate": 1200.610048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.305558829
    },
    {
      "Date": "8/23/2019",
      "Time": "1:41:00 AM",
      "Inbound Traffic Rate": 3.64802,
      "Outbound Traffic Rate": 1213.369984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.300651907
    },
    {
      "Date": "8/23/2019",
      "Time": "1:46:00 AM",
      "Inbound Traffic Rate": 3.4803,
      "Outbound Traffic Rate": 1277.289984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.272475322
    },
    {
      "Date": "8/23/2019",
      "Time": "1:51:00 AM",
      "Inbound Traffic Rate": 3.65977,
      "Outbound Traffic Rate": 1216.029952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.300960514
    },
    {
      "Date": "8/23/2019",
      "Time": "1:56:00 AM",
      "Inbound Traffic Rate": 3.51074,
      "Outbound Traffic Rate": 1233.490048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.284618429
    },
    {
      "Date": "8/23/2019",
      "Time": "2:01:00 AM",
      "Inbound Traffic Rate": 3.85318,
      "Outbound Traffic Rate": 1218.700032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.316171322
    },
    {
      "Date": "8/23/2019",
      "Time": "2:06:00 AM",
      "Inbound Traffic Rate": 3.37837,
      "Outbound Traffic Rate": 1175.420032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.287418107
    },
    {
      "Date": "8/23/2019",
      "Time": "2:11:00 AM",
      "Inbound Traffic Rate": 3.41854,
      "Outbound Traffic Rate": 1138.589952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.300243296
    },
    {
      "Date": "8/23/2019",
      "Time": "2:16:00 AM",
      "Inbound Traffic Rate": 4.01762,
      "Outbound Traffic Rate": 1089.170048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.368869857
    },
    {
      "Date": "8/23/2019",
      "Time": "2:21:00 AM",
      "Inbound Traffic Rate": 3.6604,
      "Outbound Traffic Rate": 1086.249984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.336975839
    },
    {
      "Date": "8/23/2019",
      "Time": "2:26:00 AM",
      "Inbound Traffic Rate": 4.04211,
      "Outbound Traffic Rate": 1054.390016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.383360041
    },
    {
      "Date": "8/23/2019",
      "Time": "2:31:00 AM",
      "Inbound Traffic Rate": 3.96535,
      "Outbound Traffic Rate": 1014.769984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.39076343
    },
    {
      "Date": "8/23/2019",
      "Time": "2:36:00 AM",
      "Inbound Traffic Rate": 3.91473,
      "Outbound Traffic Rate": 1032.739968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.379062506
    },
    {
      "Date": "8/23/2019",
      "Time": "2:41:00 AM",
      "Inbound Traffic Rate": 4.38536,
      "Outbound Traffic Rate": 1076.329984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.407436387
    },
    {
      "Date": "8/23/2019",
      "Time": "2:46:00 AM",
      "Inbound Traffic Rate": 3.89416,
      "Outbound Traffic Rate": 984.990976,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.395349815
    },
    {
      "Date": "8/23/2019",
      "Time": "2:51:00 AM",
      "Inbound Traffic Rate": 3.46522,
      "Outbound Traffic Rate": 972.595008,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.356286015
    },
    {
      "Date": "8/23/2019",
      "Time": "2:56:00 AM",
      "Inbound Traffic Rate": 3.54573,
      "Outbound Traffic Rate": 966.905024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.366709233
    },
    {
      "Date": "8/23/2019",
      "Time": "3:01:00 AM",
      "Inbound Traffic Rate": 3.27166,
      "Outbound Traffic Rate": 941.459968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.3475092
    },
    {
      "Date": "8/23/2019",
      "Time": "3:06:00 AM",
      "Inbound Traffic Rate": 3.15019,
      "Outbound Traffic Rate": 927.193024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.339755576
    },
    {
      "Date": "8/23/2019",
      "Time": "3:11:00 AM",
      "Inbound Traffic Rate": 2.9997,
      "Outbound Traffic Rate": 928.707008,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.322997455
    },
    {
      "Date": "8/23/2019",
      "Time": "3:16:00 AM",
      "Inbound Traffic Rate": 3.25704,
      "Outbound Traffic Rate": 898.734016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.362403107
    },
    {
      "Date": "8/23/2019",
      "Time": "3:21:00 AM",
      "Inbound Traffic Rate": 3.18405,
      "Outbound Traffic Rate": 947.835008,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.335928719
    },
    {
      "Date": "8/23/2019",
      "Time": "3:26:00 AM",
      "Inbound Traffic Rate": 3.33838,
      "Outbound Traffic Rate": 883.873984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.377698638
    },
    {
      "Date": "8/23/2019",
      "Time": "3:31:00 AM",
      "Inbound Traffic Rate": 3.3979,
      "Outbound Traffic Rate": 876.092032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.387847381
    },
    {
      "Date": "8/23/2019",
      "Time": "3:36:00 AM",
      "Inbound Traffic Rate": 3.1873,
      "Outbound Traffic Rate": 894.364032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.356376138
    },
    {
      "Date": "8/23/2019",
      "Time": "3:41:00 AM",
      "Inbound Traffic Rate": 3.20156,
      "Outbound Traffic Rate": 865.187968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.370042132
    },
    {
      "Date": "8/23/2019",
      "Time": "3:46:00 AM",
      "Inbound Traffic Rate": 3.37565,
      "Outbound Traffic Rate": 792.713984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.425834547
    },
    {
      "Date": "8/23/2019",
      "Time": "3:51:00 AM",
      "Inbound Traffic Rate": 3.0805,
      "Outbound Traffic Rate": 708.835008,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.434586323
    },
    {
      "Date": "8/23/2019",
      "Time": "3:56:00 AM",
      "Inbound Traffic Rate": 3.0015,
      "Outbound Traffic Rate": 651.243008,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.460887866
    },
    {
      "Date": "8/23/2019",
      "Time": "4:01:00 AM",
      "Inbound Traffic Rate": 3.17297,
      "Outbound Traffic Rate": 734.041024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.432260582
    },
    {
      "Date": "8/23/2019",
      "Time": "4:06:00 AM",
      "Inbound Traffic Rate": 2.95395,
      "Outbound Traffic Rate": 723.752,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.40814395
    },
    {
      "Date": "8/23/2019",
      "Time": "4:11:00 AM",
      "Inbound Traffic Rate": 3.72794,
      "Outbound Traffic Rate": 689.822016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.54042056
    },
    {
      "Date": "8/23/2019",
      "Time": "4:16:00 AM",
      "Inbound Traffic Rate": 3.48531,
      "Outbound Traffic Rate": 749.745024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.46486604
    },
    {
      "Date": "8/23/2019",
      "Time": "4:21:00 AM",
      "Inbound Traffic Rate": 2.83395,
      "Outbound Traffic Rate": 793.627008,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.357088402
    },
    {
      "Date": "8/23/2019",
      "Time": "4:26:00 AM",
      "Inbound Traffic Rate": 2.88538,
      "Outbound Traffic Rate": 770.449984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.374505816
    },
    {
      "Date": "8/23/2019",
      "Time": "4:31:00 AM",
      "Inbound Traffic Rate": 3.83189,
      "Outbound Traffic Rate": 796.638016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.481007675
    },
    {
      "Date": "8/23/2019",
      "Time": "4:36:00 AM",
      "Inbound Traffic Rate": 3.19301,
      "Outbound Traffic Rate": 839.136,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.380511621
    },
    {
      "Date": "8/23/2019",
      "Time": "4:41:00 AM",
      "Inbound Traffic Rate": 3.46396,
      "Outbound Traffic Rate": 847.857024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.408554733
    },
    {
      "Date": "8/23/2019",
      "Time": "4:46:00 AM",
      "Inbound Traffic Rate": 2.81545,
      "Outbound Traffic Rate": 842.083008,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.334343524
    },
    {
      "Date": "8/23/2019",
      "Time": "4:51:00 AM",
      "Inbound Traffic Rate": 3.09196,
      "Outbound Traffic Rate": 783.812992,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.394476748
    },
    {
      "Date": "8/23/2019",
      "Time": "4:56:00 AM",
      "Inbound Traffic Rate": 3.32874,
      "Outbound Traffic Rate": 773.513024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.430340524
    },
    {
      "Date": "8/23/2019",
      "Time": "5:01:00 AM",
      "Inbound Traffic Rate": 2.99316,
      "Outbound Traffic Rate": 805.566016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.371559865
    },
    {
      "Date": "8/23/2019",
      "Time": "5:06:00 AM",
      "Inbound Traffic Rate": 3.16117,
      "Outbound Traffic Rate": 742.454016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.42577317
    },
    {
      "Date": "8/23/2019",
      "Time": "5:11:00 AM",
      "Inbound Traffic Rate": 3.89602,
      "Outbound Traffic Rate": 768.046976,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.507263243
    },
    {
      "Date": "8/23/2019",
      "Time": "5:16:00 AM",
      "Inbound Traffic Rate": 3.58206,
      "Outbound Traffic Rate": 755.649984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.474036932
    },
    {
      "Date": "8/23/2019",
      "Time": "5:21:00 AM",
      "Inbound Traffic Rate": 3.43836,
      "Outbound Traffic Rate": 743.462976,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.462478982
    },
    {
      "Date": "8/23/2019",
      "Time": "5:26:00 AM",
      "Inbound Traffic Rate": 3.39481,
      "Outbound Traffic Rate": 760.72,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.446262751
    },
    {
      "Date": "8/23/2019",
      "Time": "5:31:00 AM",
      "Inbound Traffic Rate": 3.93577,
      "Outbound Traffic Rate": 761.329984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.516959805
    },
    {
      "Date": "8/23/2019",
      "Time": "5:36:00 AM",
      "Inbound Traffic Rate": 4.5744,
      "Outbound Traffic Rate": 771.528,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.592901359
    },
    {
      "Date": "8/23/2019",
      "Time": "5:41:00 AM",
      "Inbound Traffic Rate": 3.84713,
      "Outbound Traffic Rate": 866.353024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.444060319
    },
    {
      "Date": "8/23/2019",
      "Time": "5:46:00 AM",
      "Inbound Traffic Rate": 4.20228,
      "Outbound Traffic Rate": 886.289024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.474143297
    },
    {
      "Date": "8/23/2019",
      "Time": "5:51:00 AM",
      "Inbound Traffic Rate": 4.58971,
      "Outbound Traffic Rate": 939.393024,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.488582508
    },
    {
      "Date": "8/23/2019",
      "Time": "5:56:00 AM",
      "Inbound Traffic Rate": 4.45408,
      "Outbound Traffic Rate": 894.044032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.498194702
    },
    {
      "Date": "8/23/2019",
      "Time": "6:01:00 AM",
      "Inbound Traffic Rate": 3.95474,
      "Outbound Traffic Rate": 1031.68,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.383330102
    },
    {
      "Date": "8/23/2019",
      "Time": "6:06:00 AM",
      "Inbound Traffic Rate": 3.58447,
      "Outbound Traffic Rate": 1030.56,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.347817691
    },
    {
      "Date": "8/23/2019",
      "Time": "6:11:00 AM",
      "Inbound Traffic Rate": 3.59453,
      "Outbound Traffic Rate": 1088.909952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.330103513
    },
    {
      "Date": "8/23/2019",
      "Time": "6:16:00 AM",
      "Inbound Traffic Rate": 3.37795,
      "Outbound Traffic Rate": 1100.269952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.30701102
    },
    {
      "Date": "8/23/2019",
      "Time": "6:21:00 AM",
      "Inbound Traffic Rate": 3.14053,
      "Outbound Traffic Rate": 1067.459968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.294205881
    },
    {
      "Date": "8/23/2019",
      "Time": "6:26:00 AM",
      "Inbound Traffic Rate": 3.25604,
      "Outbound Traffic Rate": 1039.990016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.313083775
    },
    {
      "Date": "8/23/2019",
      "Time": "6:31:00 AM",
      "Inbound Traffic Rate": 3.03957,
      "Outbound Traffic Rate": 1020.190016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.297941555
    },
    {
      "Date": "8/23/2019",
      "Time": "6:36:00 AM",
      "Inbound Traffic Rate": 3.63631,
      "Outbound Traffic Rate": 1066.249984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.341037285
    },
    {
      "Date": "8/23/2019",
      "Time": "6:41:00 AM",
      "Inbound Traffic Rate": 3.66748,
      "Outbound Traffic Rate": 1010.84,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.362815084
    },
    {
      "Date": "8/23/2019",
      "Time": "6:46:00 AM",
      "Inbound Traffic Rate": 3.49986,
      "Outbound Traffic Rate": 1017.350016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.344017294
    },
    {
      "Date": "8/23/2019",
      "Time": "6:51:00 AM",
      "Inbound Traffic Rate": 3.64068,
      "Outbound Traffic Rate": 1048.220032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.347320208
    },
    {
      "Date": "8/23/2019",
      "Time": "6:56:00 AM",
      "Inbound Traffic Rate": 3.01757,
      "Outbound Traffic Rate": 1040.070016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.290131429
    },
    {
      "Date": "8/23/2019",
      "Time": "7:01:00 AM",
      "Inbound Traffic Rate": 2.43055,
      "Outbound Traffic Rate": 974.182016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.249496497
    },
    {
      "Date": "8/23/2019",
      "Time": "7:06:00 AM",
      "Inbound Traffic Rate": 2.80614,
      "Outbound Traffic Rate": 1003.16,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.279730053
    },
    {
      "Date": "8/23/2019",
      "Time": "7:11:00 AM",
      "Inbound Traffic Rate": 3.24947,
      "Outbound Traffic Rate": 962.060032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.337761667
    },
    {
      "Date": "8/23/2019",
      "Time": "7:16:00 AM",
      "Inbound Traffic Rate": 3.11815,
      "Outbound Traffic Rate": 979.145984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.318456088
    },
    {
      "Date": "8/23/2019",
      "Time": "7:21:00 AM",
      "Inbound Traffic Rate": 3.12986,
      "Outbound Traffic Rate": 1012.969984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.308978553
    },
    {
      "Date": "8/23/2019",
      "Time": "7:26:00 AM",
      "Inbound Traffic Rate": 3.19495,
      "Outbound Traffic Rate": 1021.009984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.312920544
    },
    {
      "Date": "8/23/2019",
      "Time": "7:31:00 AM",
      "Inbound Traffic Rate": 4.10829,
      "Outbound Traffic Rate": 1066.339968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.385270188
    },
    {
      "Date": "8/23/2019",
      "Time": "7:36:00 AM",
      "Inbound Traffic Rate": 3.77314,
      "Outbound Traffic Rate": 1110.429952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.339790907
    },
    {
      "Date": "8/23/2019",
      "Time": "7:41:00 AM",
      "Inbound Traffic Rate": 3.24703,
      "Outbound Traffic Rate": 1127.859968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.287893009
    },
    {
      "Date": "8/23/2019",
      "Time": "7:46:00 AM",
      "Inbound Traffic Rate": 3.2791,
      "Outbound Traffic Rate": 1079.389952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.30379197
    },
    {
      "Date": "8/23/2019",
      "Time": "7:51:00 AM",
      "Inbound Traffic Rate": 3.11699,
      "Outbound Traffic Rate": 1084.499968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.287412641
    },
    {
      "Date": "8/23/2019",
      "Time": "7:56:00 AM",
      "Inbound Traffic Rate": 3.25835,
      "Outbound Traffic Rate": 1025.219968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.3178196
    },
    {
      "Date": "8/23/2019",
      "Time": "8:01:00 AM",
      "Inbound Traffic Rate": 3.04218,
      "Outbound Traffic Rate": 1060.270016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.286925024
    },
    {
      "Date": "8/23/2019",
      "Time": "8:06:00 AM",
      "Inbound Traffic Rate": 3.21487,
      "Outbound Traffic Rate": 1116.899968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.287838669
    },
    {
      "Date": "8/23/2019",
      "Time": "8:11:00 AM",
      "Inbound Traffic Rate": 3.74397,
      "Outbound Traffic Rate": 1128.790016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.331679936
    },
    {
      "Date": "8/23/2019",
      "Time": "8:16:00 AM",
      "Inbound Traffic Rate": 4.67789,
      "Outbound Traffic Rate": 1217.810048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.384123124
    },
    {
      "Date": "8/23/2019",
      "Time": "8:21:00 AM",
      "Inbound Traffic Rate": 3.8095,
      "Outbound Traffic Rate": 1185.379968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.321373745
    },
    {
      "Date": "8/23/2019",
      "Time": "8:26:00 AM",
      "Inbound Traffic Rate": 3.865,
      "Outbound Traffic Rate": 1190.680064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.32460441
    },
    {
      "Date": "8/23/2019",
      "Time": "8:31:00 AM",
      "Inbound Traffic Rate": 3.29832,
      "Outbound Traffic Rate": 1206.530048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.273372388
    },
    {
      "Date": "8/23/2019",
      "Time": "8:36:00 AM",
      "Inbound Traffic Rate": 3.53107,
      "Outbound Traffic Rate": 1261.340032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.279945923
    },
    {
      "Date": "8/23/2019",
      "Time": "8:41:00 AM",
      "Inbound Traffic Rate": 3.51536,
      "Outbound Traffic Rate": 1265.289984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.277830382
    },
    {
      "Date": "8/23/2019",
      "Time": "8:46:00 AM",
      "Inbound Traffic Rate": 3.89148,
      "Outbound Traffic Rate": 1320.899968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.294608229
    },
    {
      "Date": "8/23/2019",
      "Time": "8:51:00 AM",
      "Inbound Traffic Rate": 3.96974,
      "Outbound Traffic Rate": 1333.549952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.297682137
    },
    {
      "Date": "8/23/2019",
      "Time": "8:56:00 AM",
      "Inbound Traffic Rate": 4.36186,
      "Outbound Traffic Rate": 1342.24,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.324968709
    },
    {
      "Date": "8/23/2019",
      "Time": "9:01:00 AM",
      "Inbound Traffic Rate": 4.43663,
      "Outbound Traffic Rate": 1349.699968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.328712314
    },
    {
      "Date": "8/23/2019",
      "Time": "9:06:00 AM",
      "Inbound Traffic Rate": 4.56171,
      "Outbound Traffic Rate": 1332.120064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.342439854
    },
    {
      "Date": "8/23/2019",
      "Time": "9:11:00 AM",
      "Inbound Traffic Rate": 4.75335,
      "Outbound Traffic Rate": 1362.850048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.348780118
    },
    {
      "Date": "8/23/2019",
      "Time": "9:16:00 AM",
      "Inbound Traffic Rate": 4.72524,
      "Outbound Traffic Rate": 1358.729984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.347768876
    },
    {
      "Date": "8/23/2019",
      "Time": "9:21:00 AM",
      "Inbound Traffic Rate": 5.41388,
      "Outbound Traffic Rate": 1410.470016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.383835171
    },
    {
      "Date": "8/23/2019",
      "Time": "9:26:00 AM",
      "Inbound Traffic Rate": 5.61956,
      "Outbound Traffic Rate": 1417.250048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.396511541
    },
    {
      "Date": "8/23/2019",
      "Time": "9:31:00 AM",
      "Inbound Traffic Rate": 5.50595,
      "Outbound Traffic Rate": 1441.84,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.381869694
    },
    {
      "Date": "8/23/2019",
      "Time": "9:36:00 AM",
      "Inbound Traffic Rate": 5.28095,
      "Outbound Traffic Rate": 1453.769984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.363258979
    },
    {
      "Date": "8/23/2019",
      "Time": "9:41:00 AM",
      "Inbound Traffic Rate": 4.96927,
      "Outbound Traffic Rate": 1476.589952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.336536897
    },
    {
      "Date": "8/23/2019",
      "Time": "9:46:00 AM",
      "Inbound Traffic Rate": 4.71524,
      "Outbound Traffic Rate": 1465.479936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.321753979
    },
    {
      "Date": "8/23/2019",
      "Time": "9:51:00 AM",
      "Inbound Traffic Rate": 4.56119,
      "Outbound Traffic Rate": 1439.559936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.316846134
    },
    {
      "Date": "8/23/2019",
      "Time": "9:56:00 AM",
      "Inbound Traffic Rate": 4.48287,
      "Outbound Traffic Rate": 1462.230016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.306577621
    },
    {
      "Date": "8/23/2019",
      "Time": "10:01:00 AM",
      "Inbound Traffic Rate": 4.9672,
      "Outbound Traffic Rate": 1504.8,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.330090377
    },
    {
      "Date": "8/23/2019",
      "Time": "10:06:00 AM",
      "Inbound Traffic Rate": 5.3707,
      "Outbound Traffic Rate": 1558.230016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.344666702
    },
    {
      "Date": "8/23/2019",
      "Time": "10:11:00 AM",
      "Inbound Traffic Rate": 5.15705,
      "Outbound Traffic Rate": 1582.930048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.325791402
    },
    {
      "Date": "8/23/2019",
      "Time": "10:16:00 AM",
      "Inbound Traffic Rate": 5.55638,
      "Outbound Traffic Rate": 1590.210048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.349411702
    },
    {
      "Date": "8/23/2019",
      "Time": "10:21:00 AM",
      "Inbound Traffic Rate": 5.29054,
      "Outbound Traffic Rate": 1617.059968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.327170303
    },
    {
      "Date": "8/23/2019",
      "Time": "10:26:00 AM",
      "Inbound Traffic Rate": 5.14524,
      "Outbound Traffic Rate": 1628.770048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.315897263
    },
    {
      "Date": "8/23/2019",
      "Time": "10:31:00 AM",
      "Inbound Traffic Rate": 5.19695,
      "Outbound Traffic Rate": 1567.660032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.331510015
    },
    {
      "Date": "8/23/2019",
      "Time": "10:36:00 AM",
      "Inbound Traffic Rate": 5.68735,
      "Outbound Traffic Rate": 1648.08,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.345089437
    },
    {
      "Date": "8/23/2019",
      "Time": "10:41:00 AM",
      "Inbound Traffic Rate": 5.79503,
      "Outbound Traffic Rate": 1678.749952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.345199116
    },
    {
      "Date": "8/23/2019",
      "Time": "10:46:00 AM",
      "Inbound Traffic Rate": 5.28877,
      "Outbound Traffic Rate": 1658.119936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.318961849
    },
    {
      "Date": "8/23/2019",
      "Time": "10:51:00 AM",
      "Inbound Traffic Rate": 5.22173,
      "Outbound Traffic Rate": 1703.340032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.306558286
    },
    {
      "Date": "8/23/2019",
      "Time": "10:56:00 AM",
      "Inbound Traffic Rate": 5.17206,
      "Outbound Traffic Rate": 1696.829952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.304807208
    },
    {
      "Date": "8/23/2019",
      "Time": "11:01:00 AM",
      "Inbound Traffic Rate": 4.89156,
      "Outbound Traffic Rate": 1673.789952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.292244555
    },
    {
      "Date": "8/23/2019",
      "Time": "11:06:00 AM",
      "Inbound Traffic Rate": 4.26064,
      "Outbound Traffic Rate": 1644.930048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.259016486
    },
    {
      "Date": "8/23/2019",
      "Time": "11:11:00 AM",
      "Inbound Traffic Rate": 4.34659,
      "Outbound Traffic Rate": 1616.179968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.268942202
    },
    {
      "Date": "8/23/2019",
      "Time": "11:16:00 AM",
      "Inbound Traffic Rate": 4.94322,
      "Outbound Traffic Rate": 1574.499968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.313954913
    },
    {
      "Date": "8/23/2019",
      "Time": "11:21:00 AM",
      "Inbound Traffic Rate": 5.45836,
      "Outbound Traffic Rate": 1629.970048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.334874865
    },
    {
      "Date": "8/23/2019",
      "Time": "11:26:00 AM",
      "Inbound Traffic Rate": 5.02322,
      "Outbound Traffic Rate": 1653.549952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.303783989
    },
    {
      "Date": "8/23/2019",
      "Time": "11:31:00 AM",
      "Inbound Traffic Rate": 5.10541,
      "Outbound Traffic Rate": 1699.910016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.300334133
    },
    {
      "Date": "8/23/2019",
      "Time": "11:36:00 AM",
      "Inbound Traffic Rate": 5.63612,
      "Outbound Traffic Rate": 1722.739968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.327160228
    },
    {
      "Date": "8/23/2019",
      "Time": "11:41:00 AM",
      "Inbound Traffic Rate": 5.5415,
      "Outbound Traffic Rate": 1712.109952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.323664961
    },
    {
      "Date": "8/23/2019",
      "Time": "11:46:00 AM",
      "Inbound Traffic Rate": 5.15143,
      "Outbound Traffic Rate": 1638.540032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.314391464
    },
    {
      "Date": "8/23/2019",
      "Time": "11:51:00 AM",
      "Inbound Traffic Rate": 4.92557,
      "Outbound Traffic Rate": 1702.150016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.289373437
    },
    {
      "Date": "8/23/2019",
      "Time": "11:56:00 AM",
      "Inbound Traffic Rate": 4.96453,
      "Outbound Traffic Rate": 1615.399936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.307325133
    },
    {
      "Date": "8/23/2019",
      "Time": "12:01:00 PM",
      "Inbound Traffic Rate": 4.83432,
      "Outbound Traffic Rate": 1623.239936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.297819188
    },
    {
      "Date": "8/23/2019",
      "Time": "12:06:00 PM",
      "Inbound Traffic Rate": 5.06729,
      "Outbound Traffic Rate": 1621.769984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.312454297
    },
    {
      "Date": "8/23/2019",
      "Time": "12:11:00 PM",
      "Inbound Traffic Rate": 5.34121,
      "Outbound Traffic Rate": 1575.609984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.338993155
    },
    {
      "Date": "8/23/2019",
      "Time": "12:16:00 PM",
      "Inbound Traffic Rate": 6.69407,
      "Outbound Traffic Rate": 1628.860032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.410966557
    },
    {
      "Date": "8/23/2019",
      "Time": "12:21:00 PM",
      "Inbound Traffic Rate": 6.94348,
      "Outbound Traffic Rate": 1632.16,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.425416626
    },
    {
      "Date": "8/23/2019",
      "Time": "12:26:00 PM",
      "Inbound Traffic Rate": 5.48276,
      "Outbound Traffic Rate": 1650.610048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.332165675
    },
    {
      "Date": "8/23/2019",
      "Time": "12:31:00 PM",
      "Inbound Traffic Rate": 5.14271,
      "Outbound Traffic Rate": 1691.76,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.30398579
    },
    {
      "Date": "8/23/2019",
      "Time": "12:36:00 PM",
      "Inbound Traffic Rate": 4.93285,
      "Outbound Traffic Rate": 1646.770048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.299546983
    },
    {
      "Date": "8/23/2019",
      "Time": "12:41:00 PM",
      "Inbound Traffic Rate": 4.81247,
      "Outbound Traffic Rate": 1684.08,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.285762553
    },
    {
      "Date": "8/23/2019",
      "Time": "12:46:00 PM",
      "Inbound Traffic Rate": 5.07506,
      "Outbound Traffic Rate": 1696.64,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.299124151
    },
    {
      "Date": "8/23/2019",
      "Time": "12:51:00 PM",
      "Inbound Traffic Rate": 5.44587,
      "Outbound Traffic Rate": 1719.459968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.31671979
    },
    {
      "Date": "8/23/2019",
      "Time": "12:56:00 PM",
      "Inbound Traffic Rate": 5.39007,
      "Outbound Traffic Rate": 1688.349952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.319250757
    },
    {
      "Date": "8/23/2019",
      "Time": "1:01:00 PM",
      "Inbound Traffic Rate": 6.26472,
      "Outbound Traffic Rate": 1693.990016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.369820361
    },
    {
      "Date": "8/23/2019",
      "Time": "1:06:00 PM",
      "Inbound Traffic Rate": 5.66112,
      "Outbound Traffic Rate": 1754.310016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.32269781
    },
    {
      "Date": "8/23/2019",
      "Time": "1:11:00 PM",
      "Inbound Traffic Rate": 5.37528,
      "Outbound Traffic Rate": 1675.699968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.320778188
    },
    {
      "Date": "8/23/2019",
      "Time": "1:16:00 PM",
      "Inbound Traffic Rate": 4.77634,
      "Outbound Traffic Rate": 1668.829952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.286208909
    },
    {
      "Date": "8/23/2019",
      "Time": "1:21:00 PM",
      "Inbound Traffic Rate": 4.94376,
      "Outbound Traffic Rate": 1757.28,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.281330238
    },
    {
      "Date": "8/23/2019",
      "Time": "1:26:00 PM",
      "Inbound Traffic Rate": 5.08296,
      "Outbound Traffic Rate": 1720.969984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.295354367
    },
    {
      "Date": "8/23/2019",
      "Time": "1:31:00 PM",
      "Inbound Traffic Rate": 5.14678,
      "Outbound Traffic Rate": 1730.790016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.29736594
    },
    {
      "Date": "8/23/2019",
      "Time": "1:36:00 PM",
      "Inbound Traffic Rate": 5.61527,
      "Outbound Traffic Rate": 1735.190016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.323611244
    },
    {
      "Date": "8/23/2019",
      "Time": "1:41:00 PM",
      "Inbound Traffic Rate": 5.22153,
      "Outbound Traffic Rate": 1695.28,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.308003988
    },
    {
      "Date": "8/23/2019",
      "Time": "1:46:00 PM",
      "Inbound Traffic Rate": 5.38791,
      "Outbound Traffic Rate": 1737.330048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.310125874
    },
    {
      "Date": "8/23/2019",
      "Time": "1:51:00 PM",
      "Inbound Traffic Rate": 5.37525,
      "Outbound Traffic Rate": 1763.800064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.304753929
    },
    {
      "Date": "8/23/2019",
      "Time": "1:56:00 PM",
      "Inbound Traffic Rate": 5.62724,
      "Outbound Traffic Rate": 1732.259968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.324849624
    },
    {
      "Date": "8/23/2019",
      "Time": "2:01:00 PM",
      "Inbound Traffic Rate": 5.35956,
      "Outbound Traffic Rate": 1726.700032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.31039323
    },
    {
      "Date": "8/23/2019",
      "Time": "2:06:00 PM",
      "Inbound Traffic Rate": 4.99303,
      "Outbound Traffic Rate": 1671.769984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.298667284
    },
    {
      "Date": "8/23/2019",
      "Time": "2:11:00 PM",
      "Inbound Traffic Rate": 4.75808,
      "Outbound Traffic Rate": 1743.92,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.272838204
    },
    {
      "Date": "8/23/2019",
      "Time": "2:16:00 PM",
      "Inbound Traffic Rate": 5.03315,
      "Outbound Traffic Rate": 1717.580032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.293037291
    },
    {
      "Date": "8/23/2019",
      "Time": "2:21:00 PM",
      "Inbound Traffic Rate": 5.17472,
      "Outbound Traffic Rate": 1712.850048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.302111677
    },
    {
      "Date": "8/23/2019",
      "Time": "2:26:00 PM",
      "Inbound Traffic Rate": 5.40164,
      "Outbound Traffic Rate": 1731.28,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.31200268
    },
    {
      "Date": "8/23/2019",
      "Time": "2:31:00 PM",
      "Inbound Traffic Rate": 5.44675,
      "Outbound Traffic Rate": 1746.749952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.311821964
    },
    {
      "Date": "8/23/2019",
      "Time": "2:36:00 PM",
      "Inbound Traffic Rate": 6.19834,
      "Outbound Traffic Rate": 1764.889984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.351202628
    },
    {
      "Date": "8/23/2019",
      "Time": "2:41:00 PM",
      "Inbound Traffic Rate": 6.08024,
      "Outbound Traffic Rate": 1781.910016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.341220373
    },
    {
      "Date": "8/23/2019",
      "Time": "2:46:00 PM",
      "Inbound Traffic Rate": 5.38618,
      "Outbound Traffic Rate": 1685.299968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.319597704
    },
    {
      "Date": "8/23/2019",
      "Time": "2:51:00 PM",
      "Inbound Traffic Rate": 4.97811,
      "Outbound Traffic Rate": 1630.200064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.305368041
    },
    {
      "Date": "8/23/2019",
      "Time": "2:56:00 PM",
      "Inbound Traffic Rate": 4.807,
      "Outbound Traffic Rate": 1671.44,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.287596324
    },
    {
      "Date": "8/23/2019",
      "Time": "3:01:00 PM",
      "Inbound Traffic Rate": 4.51761,
      "Outbound Traffic Rate": 1677.740032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.269267581
    },
    {
      "Date": "8/23/2019",
      "Time": "3:06:00 PM",
      "Inbound Traffic Rate": 4.1835,
      "Outbound Traffic Rate": 1757.100032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.238091169
    },
    {
      "Date": "8/23/2019",
      "Time": "3:11:00 PM",
      "Inbound Traffic Rate": 4.34851,
      "Outbound Traffic Rate": 1764.210048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.246484822
    },
    {
      "Date": "8/23/2019",
      "Time": "3:16:00 PM",
      "Inbound Traffic Rate": 4.87652,
      "Outbound Traffic Rate": 1777.810048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.274299271
    },
    {
      "Date": "8/23/2019",
      "Time": "3:21:00 PM",
      "Inbound Traffic Rate": 4.79371,
      "Outbound Traffic Rate": 1741.750016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.275223767
    },
    {
      "Date": "8/23/2019",
      "Time": "3:26:00 PM",
      "Inbound Traffic Rate": 4.45182,
      "Outbound Traffic Rate": 1728.829952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.257504794
    },
    {
      "Date": "8/23/2019",
      "Time": "3:31:00 PM",
      "Inbound Traffic Rate": 4.64037,
      "Outbound Traffic Rate": 1717.149952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.270236737
    },
    {
      "Date": "8/23/2019",
      "Time": "3:36:00 PM",
      "Inbound Traffic Rate": 5.06444,
      "Outbound Traffic Rate": 1725.350016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.293531165
    },
    {
      "Date": "8/23/2019",
      "Time": "3:41:00 PM",
      "Inbound Traffic Rate": 4.92444,
      "Outbound Traffic Rate": 1705.240064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.2887828
    },
    {
      "Date": "8/23/2019",
      "Time": "3:46:00 PM",
      "Inbound Traffic Rate": 5.01368,
      "Outbound Traffic Rate": 1676.450048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.299065278
    },
    {
      "Date": "8/23/2019",
      "Time": "3:51:00 PM",
      "Inbound Traffic Rate": 5.60583,
      "Outbound Traffic Rate": 1696.710016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.330394113
    },
    {
      "Date": "8/23/2019",
      "Time": "3:56:00 PM",
      "Inbound Traffic Rate": 5.90673,
      "Outbound Traffic Rate": 1768.64,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.333970169
    },
    {
      "Date": "8/23/2019",
      "Time": "4:01:00 PM",
      "Inbound Traffic Rate": 5.62801,
      "Outbound Traffic Rate": 1766.909952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.31852274
    },
    {
      "Date": "8/23/2019",
      "Time": "4:06:00 PM",
      "Inbound Traffic Rate": 5.32804,
      "Outbound Traffic Rate": 1799.480064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.296087748
    },
    {
      "Date": "8/23/2019",
      "Time": "4:11:00 PM",
      "Inbound Traffic Rate": 5.69494,
      "Outbound Traffic Rate": 1842.700032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.3090541
    },
    {
      "Date": "8/23/2019",
      "Time": "4:16:00 PM",
      "Inbound Traffic Rate": 6.2177,
      "Outbound Traffic Rate": 1811.399936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.343253849
    },
    {
      "Date": "8/23/2019",
      "Time": "4:21:00 PM",
      "Inbound Traffic Rate": 5.66809,
      "Outbound Traffic Rate": 1798.489984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.315158274
    },
    {
      "Date": "8/23/2019",
      "Time": "4:26:00 PM",
      "Inbound Traffic Rate": 5.63125,
      "Outbound Traffic Rate": 1724.189952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.326602646
    },
    {
      "Date": "8/23/2019",
      "Time": "4:31:00 PM",
      "Inbound Traffic Rate": 5.21564,
      "Outbound Traffic Rate": 1760.659968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.2962321
    },
    {
      "Date": "8/23/2019",
      "Time": "4:36:00 PM",
      "Inbound Traffic Rate": 5.03682,
      "Outbound Traffic Rate": 1748.899968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.287999319
    },
    {
      "Date": "8/23/2019",
      "Time": "4:41:00 PM",
      "Inbound Traffic Rate": 4.53642,
      "Outbound Traffic Rate": 1742.210048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.260383069
    },
    {
      "Date": "8/23/2019",
      "Time": "4:46:00 PM",
      "Inbound Traffic Rate": 4.85237,
      "Outbound Traffic Rate": 1766.070016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.274755245
    },
    {
      "Date": "8/23/2019",
      "Time": "4:51:00 PM",
      "Inbound Traffic Rate": 4.85349,
      "Outbound Traffic Rate": 1772.179968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.273871169
    },
    {
      "Date": "8/23/2019",
      "Time": "4:56:00 PM",
      "Inbound Traffic Rate": 4.49047,
      "Outbound Traffic Rate": 1751.640064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.256358032
    },
    {
      "Date": "8/23/2019",
      "Time": "5:01:00 PM",
      "Inbound Traffic Rate": 4.50356,
      "Outbound Traffic Rate": 1730.530048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.260241653
    },
    {
      "Date": "8/23/2019",
      "Time": "5:06:00 PM",
      "Inbound Traffic Rate": 4.44421,
      "Outbound Traffic Rate": 1706,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.260504689
    },
    {
      "Date": "8/23/2019",
      "Time": "5:11:00 PM",
      "Inbound Traffic Rate": 5.29283,
      "Outbound Traffic Rate": 1677.629952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.315494486
    },
    {
      "Date": "8/23/2019",
      "Time": "5:16:00 PM",
      "Inbound Traffic Rate": 5.29139,
      "Outbound Traffic Rate": 1666.700032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.317477044
    },
    {
      "Date": "8/23/2019",
      "Time": "5:21:00 PM",
      "Inbound Traffic Rate": 4.96718,
      "Outbound Traffic Rate": 1660.610048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.299117785
    },
    {
      "Date": "8/23/2019",
      "Time": "5:26:00 PM",
      "Inbound Traffic Rate": 4.66458,
      "Outbound Traffic Rate": 1632.940032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.285655315
    },
    {
      "Date": "8/23/2019",
      "Time": "5:31:00 PM",
      "Inbound Traffic Rate": 4.52665,
      "Outbound Traffic Rate": 1627.52,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.278131759
    },
    {
      "Date": "8/23/2019",
      "Time": "5:36:00 PM",
      "Inbound Traffic Rate": 4.54059,
      "Outbound Traffic Rate": 1658.040064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.273852852
    },
    {
      "Date": "8/23/2019",
      "Time": "5:41:00 PM",
      "Inbound Traffic Rate": 4.23485,
      "Outbound Traffic Rate": 1683.619968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.251532417
    },
    {
      "Date": "8/23/2019",
      "Time": "5:46:00 PM",
      "Inbound Traffic Rate": 4.25143,
      "Outbound Traffic Rate": 1666.540032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.255105183
    },
    {
      "Date": "8/23/2019",
      "Time": "5:51:00 PM",
      "Inbound Traffic Rate": 4.38697,
      "Outbound Traffic Rate": 1631.970048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.26881437
    },
    {
      "Date": "8/23/2019",
      "Time": "5:56:00 PM",
      "Inbound Traffic Rate": 4.7289,
      "Outbound Traffic Rate": 1710.189952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.276513144
    },
    {
      "Date": "8/23/2019",
      "Time": "6:01:00 PM",
      "Inbound Traffic Rate": 4.19389,
      "Outbound Traffic Rate": 1629.379968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.257391774
    },
    {
      "Date": "8/23/2019",
      "Time": "6:06:00 PM",
      "Inbound Traffic Rate": 3.92052,
      "Outbound Traffic Rate": 1592.889984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.246126226
    },
    {
      "Date": "8/23/2019",
      "Time": "6:11:00 PM",
      "Inbound Traffic Rate": 3.70338,
      "Outbound Traffic Rate": 1606.700032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.230496043
    },
    {
      "Date": "8/23/2019",
      "Time": "6:16:00 PM",
      "Inbound Traffic Rate": 4.39095,
      "Outbound Traffic Rate": 1567.549952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.280115475
    },
    {
      "Date": "8/23/2019",
      "Time": "6:21:00 PM",
      "Inbound Traffic Rate": 3.482,
      "Outbound Traffic Rate": 1565.180032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.222466421
    },
    {
      "Date": "8/23/2019",
      "Time": "6:26:00 PM",
      "Inbound Traffic Rate": 3.5557,
      "Outbound Traffic Rate": 1537.030016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.231335756
    },
    {
      "Date": "8/23/2019",
      "Time": "6:31:00 PM",
      "Inbound Traffic Rate": 3.65944,
      "Outbound Traffic Rate": 1535.149952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.238376713
    },
    {
      "Date": "8/23/2019",
      "Time": "6:36:00 PM",
      "Inbound Traffic Rate": 3.6518,
      "Outbound Traffic Rate": 1570.16,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.232575024
    },
    {
      "Date": "8/23/2019",
      "Time": "6:41:00 PM",
      "Inbound Traffic Rate": 3.72343,
      "Outbound Traffic Rate": 1525.449984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.244087321
    },
    {
      "Date": "8/23/2019",
      "Time": "6:46:00 PM",
      "Inbound Traffic Rate": 5.10515,
      "Outbound Traffic Rate": 1493.110016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.341913854
    },
    {
      "Date": "8/23/2019",
      "Time": "6:51:00 PM",
      "Inbound Traffic Rate": 5.83948,
      "Outbound Traffic Rate": 1471.559936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.396822437
    },
    {
      "Date": "8/23/2019",
      "Time": "6:56:00 PM",
      "Inbound Traffic Rate": 5.86104,
      "Outbound Traffic Rate": 1440.850048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.406776542
    },
    {
      "Date": "8/23/2019",
      "Time": "7:01:00 PM",
      "Inbound Traffic Rate": 6.02337,
      "Outbound Traffic Rate": 1497.789952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.402150515
    },
    {
      "Date": "8/23/2019",
      "Time": "7:06:00 PM",
      "Inbound Traffic Rate": 5.78329,
      "Outbound Traffic Rate": 1544.130048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.374533868
    },
    {
      "Date": "8/23/2019",
      "Time": "7:11:00 PM",
      "Inbound Traffic Rate": 6.13192,
      "Outbound Traffic Rate": 1520.199936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.403362732
    },
    {
      "Date": "8/23/2019",
      "Time": "7:16:00 PM",
      "Inbound Traffic Rate": 5.94803,
      "Outbound Traffic Rate": 1480.989952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.401625277
    },
    {
      "Date": "8/23/2019",
      "Time": "7:21:00 PM",
      "Inbound Traffic Rate": 5.13606,
      "Outbound Traffic Rate": 1527.900032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.336151574
    },
    {
      "Date": "8/23/2019",
      "Time": "7:26:00 PM",
      "Inbound Traffic Rate": 5.88492,
      "Outbound Traffic Rate": 1518.940032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.387435967
    },
    {
      "Date": "8/23/2019",
      "Time": "7:31:00 PM",
      "Inbound Traffic Rate": 6.78045,
      "Outbound Traffic Rate": 1545.68,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.438671006
    },
    {
      "Date": "8/23/2019",
      "Time": "7:36:00 PM",
      "Inbound Traffic Rate": 6.83546,
      "Outbound Traffic Rate": 1518.870016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.450035877
    },
    {
      "Date": "8/23/2019",
      "Time": "7:41:00 PM",
      "Inbound Traffic Rate": 6.79579,
      "Outbound Traffic Rate": 1547.590016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.439120822
    },
    {
      "Date": "8/23/2019",
      "Time": "7:46:00 PM",
      "Inbound Traffic Rate": 6.81765,
      "Outbound Traffic Rate": 1583.389952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.430573024
    },
    {
      "Date": "8/23/2019",
      "Time": "7:51:00 PM",
      "Inbound Traffic Rate": 5.74712,
      "Outbound Traffic Rate": 1564.349952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.367380713
    },
    {
      "Date": "8/23/2019",
      "Time": "7:56:00 PM",
      "Inbound Traffic Rate": 4.11085,
      "Outbound Traffic Rate": 1553.479936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.264622021
    },
    {
      "Date": "8/23/2019",
      "Time": "8:01:00 PM",
      "Inbound Traffic Rate": 4.15682,
      "Outbound Traffic Rate": 1570.889984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.264615603
    },
    {
      "Date": "8/23/2019",
      "Time": "8:06:00 PM",
      "Inbound Traffic Rate": 4.04962,
      "Outbound Traffic Rate": 1579.069952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.256456023
    },
    {
      "Date": "8/23/2019",
      "Time": "8:11:00 PM",
      "Inbound Traffic Rate": 3.81248,
      "Outbound Traffic Rate": 1605.479936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.237466686
    },
    {
      "Date": "8/23/2019",
      "Time": "8:16:00 PM",
      "Inbound Traffic Rate": 4.16269,
      "Outbound Traffic Rate": 1594.269952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.261103209
    },
    {
      "Date": "8/23/2019",
      "Time": "8:21:00 PM",
      "Inbound Traffic Rate": 4.07337,
      "Outbound Traffic Rate": 1616.989952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.251910656
    },
    {
      "Date": "8/23/2019",
      "Time": "8:26:00 PM",
      "Inbound Traffic Rate": 4.34377,
      "Outbound Traffic Rate": 1603.52,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.270889668
    },
    {
      "Date": "8/23/2019",
      "Time": "8:31:00 PM",
      "Inbound Traffic Rate": 3.70662,
      "Outbound Traffic Rate": 1612.130048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.229920657
    },
    {
      "Date": "8/23/2019",
      "Time": "8:36:00 PM",
      "Inbound Traffic Rate": 3.83125,
      "Outbound Traffic Rate": 1636.710016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.234082395
    },
    {
      "Date": "8/23/2019",
      "Time": "8:41:00 PM",
      "Inbound Traffic Rate": 4.399,
      "Outbound Traffic Rate": 1615.76,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.272255781
    },
    {
      "Date": "8/23/2019",
      "Time": "8:46:00 PM",
      "Inbound Traffic Rate": 4.71579,
      "Outbound Traffic Rate": 1621.789952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.290776866
    },
    {
      "Date": "8/23/2019",
      "Time": "8:51:00 PM",
      "Inbound Traffic Rate": 4.62547,
      "Outbound Traffic Rate": 1618.569984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.285775101
    },
    {
      "Date": "8/23/2019",
      "Time": "8:56:00 PM",
      "Inbound Traffic Rate": 4.45473,
      "Outbound Traffic Rate": 1610.940032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.276529847
    },
    {
      "Date": "8/23/2019",
      "Time": "9:01:00 PM",
      "Inbound Traffic Rate": 3.74802,
      "Outbound Traffic Rate": 1606.48,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.233306359
    },
    {
      "Date": "8/23/2019",
      "Time": "9:06:00 PM",
      "Inbound Traffic Rate": 3.88437,
      "Outbound Traffic Rate": 1633.929984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.237731729
    },
    {
      "Date": "8/23/2019",
      "Time": "9:11:00 PM",
      "Inbound Traffic Rate": 4.24364,
      "Outbound Traffic Rate": 1629.92,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.260358791
    },
    {
      "Date": "8/23/2019",
      "Time": "9:16:00 PM",
      "Inbound Traffic Rate": 3.77265,
      "Outbound Traffic Rate": 1671.820032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.225661251
    },
    {
      "Date": "8/23/2019",
      "Time": "9:21:00 PM",
      "Inbound Traffic Rate": 4.15183,
      "Outbound Traffic Rate": 1612.419968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.257490609
    },
    {
      "Date": "8/23/2019",
      "Time": "9:26:00 PM",
      "Inbound Traffic Rate": 4.42236,
      "Outbound Traffic Rate": 1624.109952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.272294372
    },
    {
      "Date": "8/23/2019",
      "Time": "9:31:00 PM",
      "Inbound Traffic Rate": 4.29584,
      "Outbound Traffic Rate": 1622.189952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.264817323
    },
    {
      "Date": "8/23/2019",
      "Time": "9:36:00 PM",
      "Inbound Traffic Rate": 4.0751,
      "Outbound Traffic Rate": 1577.350016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.258351029
    },
    {
      "Date": "8/23/2019",
      "Time": "9:41:00 PM",
      "Inbound Traffic Rate": 3.41563,
      "Outbound Traffic Rate": 1550.729984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.220259493
    },
    {
      "Date": "8/23/2019",
      "Time": "9:46:00 PM",
      "Inbound Traffic Rate": 3.38131,
      "Outbound Traffic Rate": 1590.4,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.21260752
    },
    {
      "Date": "8/23/2019",
      "Time": "9:51:00 PM",
      "Inbound Traffic Rate": 5.23949,
      "Outbound Traffic Rate": 1649.720064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.317598732
    },
    {
      "Date": "8/23/2019",
      "Time": "9:56:00 PM",
      "Inbound Traffic Rate": 3.75512,
      "Outbound Traffic Rate": 1691.510016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.221998094
    },
    {
      "Date": "8/23/2019",
      "Time": "10:01:00 PM",
      "Inbound Traffic Rate": 3.58422,
      "Outbound Traffic Rate": 1691.660032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.211875905
    },
    {
      "Date": "8/23/2019",
      "Time": "10:06:00 PM",
      "Inbound Traffic Rate": 3.72543,
      "Outbound Traffic Rate": 1665.459968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.223687754
    },
    {
      "Date": "8/23/2019",
      "Time": "10:11:00 PM",
      "Inbound Traffic Rate": 3.88636,
      "Outbound Traffic Rate": 1673.890048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.232175345
    },
    {
      "Date": "8/23/2019",
      "Time": "10:16:00 PM",
      "Inbound Traffic Rate": 3.7996,
      "Outbound Traffic Rate": 1717.970048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.221168
    },
    {
      "Date": "8/23/2019",
      "Time": "10:21:00 PM",
      "Inbound Traffic Rate": 4.00515,
      "Outbound Traffic Rate": 1664.979968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.240552444
    },
    {
      "Date": "8/23/2019",
      "Time": "10:26:00 PM",
      "Inbound Traffic Rate": 3.16867,
      "Outbound Traffic Rate": 1693.180032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.187143124
    },
    {
      "Date": "8/23/2019",
      "Time": "10:31:00 PM",
      "Inbound Traffic Rate": 2.9664,
      "Outbound Traffic Rate": 1619.640064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.183151804
    },
    {
      "Date": "8/23/2019",
      "Time": "10:36:00 PM",
      "Inbound Traffic Rate": 3.14682,
      "Outbound Traffic Rate": 1620.359936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.194204999
    },
    {
      "Date": "8/23/2019",
      "Time": "10:41:00 PM",
      "Inbound Traffic Rate": 3.59095,
      "Outbound Traffic Rate": 1551.020032,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.231521832
    },
    {
      "Date": "8/23/2019",
      "Time": "10:46:00 PM",
      "Inbound Traffic Rate": 3.52397,
      "Outbound Traffic Rate": 1571.219968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.224282409
    },
    {
      "Date": "8/23/2019",
      "Time": "10:51:00 PM",
      "Inbound Traffic Rate": 3.3665,
      "Outbound Traffic Rate": 1584.790016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.212425619
    },
    {
      "Date": "8/23/2019",
      "Time": "10:56:00 PM",
      "Inbound Traffic Rate": 3.06316,
      "Outbound Traffic Rate": 1558.680064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.196522691
    },
    {
      "Date": "8/23/2019",
      "Time": "11:01:00 PM",
      "Inbound Traffic Rate": 3.42618,
      "Outbound Traffic Rate": 1604.760064,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.213501076
    },
    {
      "Date": "8/23/2019",
      "Time": "11:06:00 PM",
      "Inbound Traffic Rate": 3.48158,
      "Outbound Traffic Rate": 1561.229952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.223002383
    },
    {
      "Date": "8/23/2019",
      "Time": "11:11:00 PM",
      "Inbound Traffic Rate": 3.53346,
      "Outbound Traffic Rate": 1662.899968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.212487827
    },
    {
      "Date": "8/23/2019",
      "Time": "11:16:00 PM",
      "Inbound Traffic Rate": 4.51583,
      "Outbound Traffic Rate": 1629.609984,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.277111091
    },
    {
      "Date": "8/23/2019",
      "Time": "11:21:00 PM",
      "Inbound Traffic Rate": 4.28957,
      "Outbound Traffic Rate": 1581.229952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.271280594
    },
    {
      "Date": "8/23/2019",
      "Time": "11:26:00 PM",
      "Inbound Traffic Rate": 3.92364,
      "Outbound Traffic Rate": 1600.669952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.245124861
    },
    {
      "Date": "8/23/2019",
      "Time": "11:31:00 PM",
      "Inbound Traffic Rate": 3.55115,
      "Outbound Traffic Rate": 1526.310016,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.232662432
    },
    {
      "Date": "8/23/2019",
      "Time": "11:36:00 PM",
      "Inbound Traffic Rate": 3.55014,
      "Outbound Traffic Rate": 1523.459968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.233031394
    },
    {
      "Date": "8/23/2019",
      "Time": "11:41:00 PM",
      "Inbound Traffic Rate": 3.7495,
      "Outbound Traffic Rate": 1526.439936,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.245636917
    },
    {
      "Date": "8/23/2019",
      "Time": "11:46:00 PM",
      "Inbound Traffic Rate": 3.45372,
      "Outbound Traffic Rate": 1500.499968,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.230171281
    },
    {
      "Date": "8/23/2019",
      "Time": "11:51:00 PM",
      "Inbound Traffic Rate": 3.60227,
      "Outbound Traffic Rate": 1511.730048,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.238287914
    },
    {
      "Date": "8/23/2019",
      "Time": "11:56:00 PM",
      "Inbound Traffic Rate": 3.08611,
      "Outbound Traffic Rate": 1468.189952,
      "Day of Week": "Friday",
      "Traffic Ratio": 0.210198278
    },
    {
      "Date": "8/24/2019",
      "Time": "12:01:00 AM",
      "Inbound Traffic Rate": 3.05626,
      "Outbound Traffic Rate": 1524.979968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.200413124
    },
    {
      "Date": "8/24/2019",
      "Time": "12:06:00 AM",
      "Inbound Traffic Rate": 3.23496,
      "Outbound Traffic Rate": 1463.190016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.221089535
    },
    {
      "Date": "8/24/2019",
      "Time": "12:11:00 AM",
      "Inbound Traffic Rate": 3.3219,
      "Outbound Traffic Rate": 1380.109952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.240698214
    },
    {
      "Date": "8/24/2019",
      "Time": "12:16:00 AM",
      "Inbound Traffic Rate": 3.65187,
      "Outbound Traffic Rate": 1398.019968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.261217299
    },
    {
      "Date": "8/24/2019",
      "Time": "12:21:00 AM",
      "Inbound Traffic Rate": 4.05065,
      "Outbound Traffic Rate": 1385.590016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.292341165
    },
    {
      "Date": "8/24/2019",
      "Time": "12:26:00 AM",
      "Inbound Traffic Rate": 4.19286,
      "Outbound Traffic Rate": 1389.750016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.301698863
    },
    {
      "Date": "8/24/2019",
      "Time": "12:31:00 AM",
      "Inbound Traffic Rate": 3.57055,
      "Outbound Traffic Rate": 1328,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.268866717
    },
    {
      "Date": "8/24/2019",
      "Time": "12:36:00 AM",
      "Inbound Traffic Rate": 3.67066,
      "Outbound Traffic Rate": 1267.740032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.28954359
    },
    {
      "Date": "8/24/2019",
      "Time": "12:41:00 AM",
      "Inbound Traffic Rate": 3.40727,
      "Outbound Traffic Rate": 1196.899968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.284674584
    },
    {
      "Date": "8/24/2019",
      "Time": "12:46:00 AM",
      "Inbound Traffic Rate": 3.57049,
      "Outbound Traffic Rate": 1223.490048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.291828283
    },
    {
      "Date": "8/24/2019",
      "Time": "12:51:00 AM",
      "Inbound Traffic Rate": 3.36395,
      "Outbound Traffic Rate": 1244.64,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.270274939
    },
    {
      "Date": "8/24/2019",
      "Time": "12:56:00 AM",
      "Inbound Traffic Rate": 3.59237,
      "Outbound Traffic Rate": 1240.099968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.289683904
    },
    {
      "Date": "8/24/2019",
      "Time": "1:01:00 AM",
      "Inbound Traffic Rate": 3.13005,
      "Outbound Traffic Rate": 1246.499968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.251107106
    },
    {
      "Date": "8/24/2019",
      "Time": "1:06:00 AM",
      "Inbound Traffic Rate": 3.20949,
      "Outbound Traffic Rate": 1319.789952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.243181879
    },
    {
      "Date": "8/24/2019",
      "Time": "1:11:00 AM",
      "Inbound Traffic Rate": 3.11656,
      "Outbound Traffic Rate": 1266.08,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.246158221
    },
    {
      "Date": "8/24/2019",
      "Time": "1:16:00 AM",
      "Inbound Traffic Rate": 3.2164,
      "Outbound Traffic Rate": 1252.08,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.256884544
    },
    {
      "Date": "8/24/2019",
      "Time": "1:21:00 AM",
      "Inbound Traffic Rate": 3.21096,
      "Outbound Traffic Rate": 1311.609984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.244810579
    },
    {
      "Date": "8/24/2019",
      "Time": "1:26:00 AM",
      "Inbound Traffic Rate": 3.31587,
      "Outbound Traffic Rate": 1387.789952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.238931691
    },
    {
      "Date": "8/24/2019",
      "Time": "1:31:00 AM",
      "Inbound Traffic Rate": 3.43108,
      "Outbound Traffic Rate": 1351.149952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.253937766
    },
    {
      "Date": "8/24/2019",
      "Time": "1:36:00 AM",
      "Inbound Traffic Rate": 3.61048,
      "Outbound Traffic Rate": 1305.209984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.276620624
    },
    {
      "Date": "8/24/2019",
      "Time": "1:41:00 AM",
      "Inbound Traffic Rate": 3.32457,
      "Outbound Traffic Rate": 1240.039936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.268101849
    },
    {
      "Date": "8/24/2019",
      "Time": "1:46:00 AM",
      "Inbound Traffic Rate": 3.66856,
      "Outbound Traffic Rate": 1244.579968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.294762899
    },
    {
      "Date": "8/24/2019",
      "Time": "1:51:00 AM",
      "Inbound Traffic Rate": 3.5863,
      "Outbound Traffic Rate": 1211.539968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.296011695
    },
    {
      "Date": "8/24/2019",
      "Time": "1:56:00 AM",
      "Inbound Traffic Rate": 3.30806,
      "Outbound Traffic Rate": 1204.610048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.27461667
    },
    {
      "Date": "8/24/2019",
      "Time": "2:01:00 AM",
      "Inbound Traffic Rate": 3.34736,
      "Outbound Traffic Rate": 1218.569984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.274695754
    },
    {
      "Date": "8/24/2019",
      "Time": "2:06:00 AM",
      "Inbound Traffic Rate": 3.68469,
      "Outbound Traffic Rate": 1139.76,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.323286481
    },
    {
      "Date": "8/24/2019",
      "Time": "2:11:00 AM",
      "Inbound Traffic Rate": 3.06719,
      "Outbound Traffic Rate": 1128.489984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.271795944
    },
    {
      "Date": "8/24/2019",
      "Time": "2:16:00 AM",
      "Inbound Traffic Rate": 3.27455,
      "Outbound Traffic Rate": 1159.090048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.282510406
    },
    {
      "Date": "8/24/2019",
      "Time": "2:21:00 AM",
      "Inbound Traffic Rate": 3.36356,
      "Outbound Traffic Rate": 1192.839936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.281979157
    },
    {
      "Date": "8/24/2019",
      "Time": "2:26:00 AM",
      "Inbound Traffic Rate": 3.13106,
      "Outbound Traffic Rate": 1185.299968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.264157604
    },
    {
      "Date": "8/24/2019",
      "Time": "2:31:00 AM",
      "Inbound Traffic Rate": 2.73222,
      "Outbound Traffic Rate": 1157.619968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.236020462
    },
    {
      "Date": "8/24/2019",
      "Time": "2:36:00 AM",
      "Inbound Traffic Rate": 2.83481,
      "Outbound Traffic Rate": 1152.509952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.245968375
    },
    {
      "Date": "8/24/2019",
      "Time": "2:41:00 AM",
      "Inbound Traffic Rate": 2.78856,
      "Outbound Traffic Rate": 1144.999936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.243542372
    },
    {
      "Date": "8/24/2019",
      "Time": "2:46:00 AM",
      "Inbound Traffic Rate": 2.7071,
      "Outbound Traffic Rate": 1058.910016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.255649674
    },
    {
      "Date": "8/24/2019",
      "Time": "2:51:00 AM",
      "Inbound Traffic Rate": 2.88695,
      "Outbound Traffic Rate": 1054.300032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.273826227
    },
    {
      "Date": "8/24/2019",
      "Time": "2:56:00 AM",
      "Inbound Traffic Rate": 3.22519,
      "Outbound Traffic Rate": 1032.08,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.312494186
    },
    {
      "Date": "8/24/2019",
      "Time": "3:01:00 AM",
      "Inbound Traffic Rate": 3.51109,
      "Outbound Traffic Rate": 1009.28,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.347880667
    },
    {
      "Date": "8/24/2019",
      "Time": "3:06:00 AM",
      "Inbound Traffic Rate": 3.60515,
      "Outbound Traffic Rate": 1080.899968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.333532252
    },
    {
      "Date": "8/24/2019",
      "Time": "3:11:00 AM",
      "Inbound Traffic Rate": 3.68414,
      "Outbound Traffic Rate": 1079.330048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.341335814
    },
    {
      "Date": "8/24/2019",
      "Time": "3:16:00 AM",
      "Inbound Traffic Rate": 3.38016,
      "Outbound Traffic Rate": 1020.659968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.331173957
    },
    {
      "Date": "8/24/2019",
      "Time": "3:21:00 AM",
      "Inbound Traffic Rate": 3.36996,
      "Outbound Traffic Rate": 1042.830016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.323155255
    },
    {
      "Date": "8/24/2019",
      "Time": "3:26:00 AM",
      "Inbound Traffic Rate": 3.30529,
      "Outbound Traffic Rate": 1022.08,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.32338858
    },
    {
      "Date": "8/24/2019",
      "Time": "3:31:00 AM",
      "Inbound Traffic Rate": 3.31118,
      "Outbound Traffic Rate": 974.452992,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.339798844
    },
    {
      "Date": "8/24/2019",
      "Time": "3:36:00 AM",
      "Inbound Traffic Rate": 2.99836,
      "Outbound Traffic Rate": 981.628032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.305447675
    },
    {
      "Date": "8/24/2019",
      "Time": "3:41:00 AM",
      "Inbound Traffic Rate": 3.26405,
      "Outbound Traffic Rate": 1043.52,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.31279228
    },
    {
      "Date": "8/24/2019",
      "Time": "3:46:00 AM",
      "Inbound Traffic Rate": 2.86324,
      "Outbound Traffic Rate": 986.844992,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.290140805
    },
    {
      "Date": "8/24/2019",
      "Time": "3:51:00 AM",
      "Inbound Traffic Rate": 2.62137,
      "Outbound Traffic Rate": 970.342976,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.27014881
    },
    {
      "Date": "8/24/2019",
      "Time": "3:56:00 AM",
      "Inbound Traffic Rate": 2.77111,
      "Outbound Traffic Rate": 917.643008,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.301981269
    },
    {
      "Date": "8/24/2019",
      "Time": "4:01:00 AM",
      "Inbound Traffic Rate": 2.92087,
      "Outbound Traffic Rate": 816.908032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.357551877
    },
    {
      "Date": "8/24/2019",
      "Time": "4:06:00 AM",
      "Inbound Traffic Rate": 2.72504,
      "Outbound Traffic Rate": 845.939968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.322131605
    },
    {
      "Date": "8/24/2019",
      "Time": "4:11:00 AM",
      "Inbound Traffic Rate": 3.50055,
      "Outbound Traffic Rate": 826.745024,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.423413495
    },
    {
      "Date": "8/24/2019",
      "Time": "4:16:00 AM",
      "Inbound Traffic Rate": 2.57482,
      "Outbound Traffic Rate": 823.728,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.312581338
    },
    {
      "Date": "8/24/2019",
      "Time": "4:21:00 AM",
      "Inbound Traffic Rate": 2.89305,
      "Outbound Traffic Rate": 777.515008,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.372089281
    },
    {
      "Date": "8/24/2019",
      "Time": "4:26:00 AM",
      "Inbound Traffic Rate": 2.92301,
      "Outbound Traffic Rate": 814.305984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.358957205
    },
    {
      "Date": "8/24/2019",
      "Time": "4:31:00 AM",
      "Inbound Traffic Rate": 3.14464,
      "Outbound Traffic Rate": 803.241024,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.391493948
    },
    {
      "Date": "8/24/2019",
      "Time": "4:36:00 AM",
      "Inbound Traffic Rate": 3.06529,
      "Outbound Traffic Rate": 788.435008,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.38878157
    },
    {
      "Date": "8/24/2019",
      "Time": "4:41:00 AM",
      "Inbound Traffic Rate": 2.78586,
      "Outbound Traffic Rate": 775.569024,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.359202071
    },
    {
      "Date": "8/24/2019",
      "Time": "4:46:00 AM",
      "Inbound Traffic Rate": 2.66664,
      "Outbound Traffic Rate": 837.854976,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.318269877
    },
    {
      "Date": "8/24/2019",
      "Time": "4:51:00 AM",
      "Inbound Traffic Rate": 2.89895,
      "Outbound Traffic Rate": 834.755008,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.347281534
    },
    {
      "Date": "8/24/2019",
      "Time": "4:56:00 AM",
      "Inbound Traffic Rate": 2.87342,
      "Outbound Traffic Rate": 821.219968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.349896509
    },
    {
      "Date": "8/24/2019",
      "Time": "5:01:00 AM",
      "Inbound Traffic Rate": 2.91421,
      "Outbound Traffic Rate": 768.233024,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.379339329
    },
    {
      "Date": "8/24/2019",
      "Time": "5:06:00 AM",
      "Inbound Traffic Rate": 2.87977,
      "Outbound Traffic Rate": 793.724032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.362817539
    },
    {
      "Date": "8/24/2019",
      "Time": "5:11:00 AM",
      "Inbound Traffic Rate": 3.26416,
      "Outbound Traffic Rate": 859.096,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.379952881
    },
    {
      "Date": "8/24/2019",
      "Time": "5:16:00 AM",
      "Inbound Traffic Rate": 3.45361,
      "Outbound Traffic Rate": 904.388992,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.381872184
    },
    {
      "Date": "8/24/2019",
      "Time": "5:21:00 AM",
      "Inbound Traffic Rate": 3.23087,
      "Outbound Traffic Rate": 852.222016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.379111304
    },
    {
      "Date": "8/24/2019",
      "Time": "5:26:00 AM",
      "Inbound Traffic Rate": 3.29365,
      "Outbound Traffic Rate": 773.313984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.425913674
    },
    {
      "Date": "8/24/2019",
      "Time": "5:31:00 AM",
      "Inbound Traffic Rate": 3.75889,
      "Outbound Traffic Rate": 813.566016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.462026428
    },
    {
      "Date": "8/24/2019",
      "Time": "5:36:00 AM",
      "Inbound Traffic Rate": 4.3384,
      "Outbound Traffic Rate": 810.432,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.535319435
    },
    {
      "Date": "8/24/2019",
      "Time": "5:41:00 AM",
      "Inbound Traffic Rate": 4.48171,
      "Outbound Traffic Rate": 835.430016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.536455468
    },
    {
      "Date": "8/24/2019",
      "Time": "5:46:00 AM",
      "Inbound Traffic Rate": 4.70599,
      "Outbound Traffic Rate": 866.68,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.542990492
    },
    {
      "Date": "8/24/2019",
      "Time": "5:51:00 AM",
      "Inbound Traffic Rate": 4.15002,
      "Outbound Traffic Rate": 939.635008,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.441662982
    },
    {
      "Date": "8/24/2019",
      "Time": "5:56:00 AM",
      "Inbound Traffic Rate": 3.75601,
      "Outbound Traffic Rate": 935.142016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.401651293
    },
    {
      "Date": "8/24/2019",
      "Time": "6:01:00 AM",
      "Inbound Traffic Rate": 3.47345,
      "Outbound Traffic Rate": 948.710976,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.366123096
    },
    {
      "Date": "8/24/2019",
      "Time": "6:06:00 AM",
      "Inbound Traffic Rate": 3.89535,
      "Outbound Traffic Rate": 977.907968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.39833503
    },
    {
      "Date": "8/24/2019",
      "Time": "6:11:00 AM",
      "Inbound Traffic Rate": 3.70179,
      "Outbound Traffic Rate": 1000.889984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.36984984
    },
    {
      "Date": "8/24/2019",
      "Time": "6:16:00 AM",
      "Inbound Traffic Rate": 3.59344,
      "Outbound Traffic Rate": 1001.459968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.358820134
    },
    {
      "Date": "8/24/2019",
      "Time": "6:21:00 AM",
      "Inbound Traffic Rate": 3.04882,
      "Outbound Traffic Rate": 949.764992,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.321007831
    },
    {
      "Date": "8/24/2019",
      "Time": "6:26:00 AM",
      "Inbound Traffic Rate": 3.39591,
      "Outbound Traffic Rate": 973.608,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.348796436
    },
    {
      "Date": "8/24/2019",
      "Time": "6:31:00 AM",
      "Inbound Traffic Rate": 3.16388,
      "Outbound Traffic Rate": 988.067968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.320208741
    },
    {
      "Date": "8/24/2019",
      "Time": "6:36:00 AM",
      "Inbound Traffic Rate": 3.23774,
      "Outbound Traffic Rate": 996.561024,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.324891293
    },
    {
      "Date": "8/24/2019",
      "Time": "6:41:00 AM",
      "Inbound Traffic Rate": 2.95785,
      "Outbound Traffic Rate": 1029.04,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.287437806
    },
    {
      "Date": "8/24/2019",
      "Time": "6:46:00 AM",
      "Inbound Traffic Rate": 3.69863,
      "Outbound Traffic Rate": 1029.190016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.359372899
    },
    {
      "Date": "8/24/2019",
      "Time": "6:51:00 AM",
      "Inbound Traffic Rate": 3.8503,
      "Outbound Traffic Rate": 1057.84,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.363977539
    },
    {
      "Date": "8/24/2019",
      "Time": "6:56:00 AM",
      "Inbound Traffic Rate": 3.55974,
      "Outbound Traffic Rate": 1069.809984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.332745072
    },
    {
      "Date": "8/24/2019",
      "Time": "7:01:00 AM",
      "Inbound Traffic Rate": 3.43719,
      "Outbound Traffic Rate": 1063.44,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.323214286
    },
    {
      "Date": "8/24/2019",
      "Time": "7:06:00 AM",
      "Inbound Traffic Rate": 3.72108,
      "Outbound Traffic Rate": 1026.689984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.362434626
    },
    {
      "Date": "8/24/2019",
      "Time": "7:11:00 AM",
      "Inbound Traffic Rate": 2.36641,
      "Outbound Traffic Rate": 990.993024,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.238791792
    },
    {
      "Date": "8/24/2019",
      "Time": "7:16:00 AM",
      "Inbound Traffic Rate": 3.67047,
      "Outbound Traffic Rate": 909.488,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.403575418
    },
    {
      "Date": "8/24/2019",
      "Time": "7:21:00 AM",
      "Inbound Traffic Rate": 3.22773,
      "Outbound Traffic Rate": 958.273984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.336827468
    },
    {
      "Date": "8/24/2019",
      "Time": "7:26:00 AM",
      "Inbound Traffic Rate": 2.71494,
      "Outbound Traffic Rate": 1009.649984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.268899128
    },
    {
      "Date": "8/24/2019",
      "Time": "7:31:00 AM",
      "Inbound Traffic Rate": 2.9867,
      "Outbound Traffic Rate": 1028.929984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.290272423
    },
    {
      "Date": "8/24/2019",
      "Time": "7:36:00 AM",
      "Inbound Traffic Rate": 2.82721,
      "Outbound Traffic Rate": 1000.060032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.282704029
    },
    {
      "Date": "8/24/2019",
      "Time": "7:41:00 AM",
      "Inbound Traffic Rate": 2.67543,
      "Outbound Traffic Rate": 1005.110016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.266182802
    },
    {
      "Date": "8/24/2019",
      "Time": "7:46:00 AM",
      "Inbound Traffic Rate": 3.53451,
      "Outbound Traffic Rate": 1050.230016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.336546275
    },
    {
      "Date": "8/24/2019",
      "Time": "7:51:00 AM",
      "Inbound Traffic Rate": 2.87634,
      "Outbound Traffic Rate": 1010.300032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.284701565
    },
    {
      "Date": "8/24/2019",
      "Time": "7:56:00 AM",
      "Inbound Traffic Rate": 2.77555,
      "Outbound Traffic Rate": 988.236992,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.280858744
    },
    {
      "Date": "8/24/2019",
      "Time": "8:01:00 AM",
      "Inbound Traffic Rate": 3.17053,
      "Outbound Traffic Rate": 970.843008,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.326574943
    },
    {
      "Date": "8/24/2019",
      "Time": "8:06:00 AM",
      "Inbound Traffic Rate": 3.55376,
      "Outbound Traffic Rate": 1069.88,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.332164355
    },
    {
      "Date": "8/24/2019",
      "Time": "8:11:00 AM",
      "Inbound Traffic Rate": 3.53249,
      "Outbound Traffic Rate": 1078.870016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.327424986
    },
    {
      "Date": "8/24/2019",
      "Time": "8:16:00 AM",
      "Inbound Traffic Rate": 3.54269,
      "Outbound Traffic Rate": 1093.830016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.323879392
    },
    {
      "Date": "8/24/2019",
      "Time": "8:21:00 AM",
      "Inbound Traffic Rate": 3.29323,
      "Outbound Traffic Rate": 1130.220032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.291379546
    },
    {
      "Date": "8/24/2019",
      "Time": "8:26:00 AM",
      "Inbound Traffic Rate": 3.12892,
      "Outbound Traffic Rate": 1141.769984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.274041186
    },
    {
      "Date": "8/24/2019",
      "Time": "8:31:00 AM",
      "Inbound Traffic Rate": 3.56228,
      "Outbound Traffic Rate": 1144.089984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.311363621
    },
    {
      "Date": "8/24/2019",
      "Time": "8:36:00 AM",
      "Inbound Traffic Rate": 3.34661,
      "Outbound Traffic Rate": 1135.2,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.294803559
    },
    {
      "Date": "8/24/2019",
      "Time": "8:41:00 AM",
      "Inbound Traffic Rate": 3.42436,
      "Outbound Traffic Rate": 1134.290048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.301894564
    },
    {
      "Date": "8/24/2019",
      "Time": "8:46:00 AM",
      "Inbound Traffic Rate": 3.67734,
      "Outbound Traffic Rate": 1198.909952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.30672362
    },
    {
      "Date": "8/24/2019",
      "Time": "8:51:00 AM",
      "Inbound Traffic Rate": 4.43846,
      "Outbound Traffic Rate": 1242.840064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.357122379
    },
    {
      "Date": "8/24/2019",
      "Time": "8:56:00 AM",
      "Inbound Traffic Rate": 4.32321,
      "Outbound Traffic Rate": 1185.769984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.364590946
    },
    {
      "Date": "8/24/2019",
      "Time": "9:01:00 AM",
      "Inbound Traffic Rate": 4.03676,
      "Outbound Traffic Rate": 1179.04,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.342376849
    },
    {
      "Date": "8/24/2019",
      "Time": "9:06:00 AM",
      "Inbound Traffic Rate": 3.74298,
      "Outbound Traffic Rate": 1212.909952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.308595044
    },
    {
      "Date": "8/24/2019",
      "Time": "9:11:00 AM",
      "Inbound Traffic Rate": 3.88074,
      "Outbound Traffic Rate": 1212.860032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.319966022
    },
    {
      "Date": "8/24/2019",
      "Time": "9:16:00 AM",
      "Inbound Traffic Rate": 3.74292,
      "Outbound Traffic Rate": 1217.670016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.30738377
    },
    {
      "Date": "8/24/2019",
      "Time": "9:21:00 AM",
      "Inbound Traffic Rate": 3.47102,
      "Outbound Traffic Rate": 1218.969984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.284750244
    },
    {
      "Date": "8/24/2019",
      "Time": "9:26:00 AM",
      "Inbound Traffic Rate": 3.42827,
      "Outbound Traffic Rate": 1272.819968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.269344455
    },
    {
      "Date": "8/24/2019",
      "Time": "9:31:00 AM",
      "Inbound Traffic Rate": 3.13289,
      "Outbound Traffic Rate": 1284.540032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.243891971
    },
    {
      "Date": "8/24/2019",
      "Time": "9:36:00 AM",
      "Inbound Traffic Rate": 3.23416,
      "Outbound Traffic Rate": 1381.689984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.234072769
    },
    {
      "Date": "8/24/2019",
      "Time": "9:41:00 AM",
      "Inbound Traffic Rate": 3.52839,
      "Outbound Traffic Rate": 1338,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.263706278
    },
    {
      "Date": "8/24/2019",
      "Time": "9:46:00 AM",
      "Inbound Traffic Rate": 3.62617,
      "Outbound Traffic Rate": 1330.089984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.272625916
    },
    {
      "Date": "8/24/2019",
      "Time": "9:51:00 AM",
      "Inbound Traffic Rate": 4.39058,
      "Outbound Traffic Rate": 1341.36,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.327323015
    },
    {
      "Date": "8/24/2019",
      "Time": "9:56:00 AM",
      "Inbound Traffic Rate": 3.86353,
      "Outbound Traffic Rate": 1354.599936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.285215575
    },
    {
      "Date": "8/24/2019",
      "Time": "10:01:00 AM",
      "Inbound Traffic Rate": 3.8873,
      "Outbound Traffic Rate": 1375.410048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.282628443
    },
    {
      "Date": "8/24/2019",
      "Time": "10:06:00 AM",
      "Inbound Traffic Rate": 3.88318,
      "Outbound Traffic Rate": 1398.329984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.277701261
    },
    {
      "Date": "8/24/2019",
      "Time": "10:11:00 AM",
      "Inbound Traffic Rate": 4.01832,
      "Outbound Traffic Rate": 1395.559936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.287936039
    },
    {
      "Date": "8/24/2019",
      "Time": "10:16:00 AM",
      "Inbound Traffic Rate": 4.02786,
      "Outbound Traffic Rate": 1413.580032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.284940358
    },
    {
      "Date": "8/24/2019",
      "Time": "10:21:00 AM",
      "Inbound Traffic Rate": 3.86481,
      "Outbound Traffic Rate": 1410.690048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.273965922
    },
    {
      "Date": "8/24/2019",
      "Time": "10:26:00 AM",
      "Inbound Traffic Rate": 4.45968,
      "Outbound Traffic Rate": 1409.6,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.316379115
    },
    {
      "Date": "8/24/2019",
      "Time": "10:31:00 AM",
      "Inbound Traffic Rate": 4.44398,
      "Outbound Traffic Rate": 1440.950016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.308406256
    },
    {
      "Date": "8/24/2019",
      "Time": "10:36:00 AM",
      "Inbound Traffic Rate": 4.26398,
      "Outbound Traffic Rate": 1455.549952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.292946319
    },
    {
      "Date": "8/24/2019",
      "Time": "10:41:00 AM",
      "Inbound Traffic Rate": 4.706,
      "Outbound Traffic Rate": 1412.600064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.333144541
    },
    {
      "Date": "8/24/2019",
      "Time": "10:46:00 AM",
      "Inbound Traffic Rate": 4.47918,
      "Outbound Traffic Rate": 1397.420032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.320532116
    },
    {
      "Date": "8/24/2019",
      "Time": "10:51:00 AM",
      "Inbound Traffic Rate": 4.16454,
      "Outbound Traffic Rate": 1455.490048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.286126312
    },
    {
      "Date": "8/24/2019",
      "Time": "10:56:00 AM",
      "Inbound Traffic Rate": 4.42117,
      "Outbound Traffic Rate": 1468.920064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.30098098
    },
    {
      "Date": "8/24/2019",
      "Time": "11:01:00 AM",
      "Inbound Traffic Rate": 4.62673,
      "Outbound Traffic Rate": 1440.940032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.321091086
    },
    {
      "Date": "8/24/2019",
      "Time": "11:06:00 AM",
      "Inbound Traffic Rate": 4.3285,
      "Outbound Traffic Rate": 1535.299968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.281931876
    },
    {
      "Date": "8/24/2019",
      "Time": "11:11:00 AM",
      "Inbound Traffic Rate": 4.61131,
      "Outbound Traffic Rate": 1510.850048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.30521295
    },
    {
      "Date": "8/24/2019",
      "Time": "11:16:00 AM",
      "Inbound Traffic Rate": 4.27083,
      "Outbound Traffic Rate": 1478.809984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.28880181
    },
    {
      "Date": "8/24/2019",
      "Time": "11:21:00 AM",
      "Inbound Traffic Rate": 3.78676,
      "Outbound Traffic Rate": 1435.410048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.263810331
    },
    {
      "Date": "8/24/2019",
      "Time": "11:26:00 AM",
      "Inbound Traffic Rate": 3.93649,
      "Outbound Traffic Rate": 1455.76,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.270407897
    },
    {
      "Date": "8/24/2019",
      "Time": "11:31:00 AM",
      "Inbound Traffic Rate": 3.59861,
      "Outbound Traffic Rate": 1461.12,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.246291201
    },
    {
      "Date": "8/24/2019",
      "Time": "11:36:00 AM",
      "Inbound Traffic Rate": 4.3996,
      "Outbound Traffic Rate": 1435.629952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.306457802
    },
    {
      "Date": "8/24/2019",
      "Time": "11:41:00 AM",
      "Inbound Traffic Rate": 4.509,
      "Outbound Traffic Rate": 1465.069952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.307766874
    },
    {
      "Date": "8/24/2019",
      "Time": "11:46:00 AM",
      "Inbound Traffic Rate": 4.24612,
      "Outbound Traffic Rate": 1511.769984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.28087077
    },
    {
      "Date": "8/24/2019",
      "Time": "11:51:00 AM",
      "Inbound Traffic Rate": 4.61516,
      "Outbound Traffic Rate": 1495.180032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.308669184
    },
    {
      "Date": "8/24/2019",
      "Time": "11:56:00 AM",
      "Inbound Traffic Rate": 4.15953,
      "Outbound Traffic Rate": 1542.8,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.269609152
    },
    {
      "Date": "8/24/2019",
      "Time": "12:01:00 PM",
      "Inbound Traffic Rate": 4.29646,
      "Outbound Traffic Rate": 1529.709952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.280867624
    },
    {
      "Date": "8/24/2019",
      "Time": "12:06:00 PM",
      "Inbound Traffic Rate": 4.02906,
      "Outbound Traffic Rate": 1537.849984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.261993045
    },
    {
      "Date": "8/24/2019",
      "Time": "12:11:00 PM",
      "Inbound Traffic Rate": 4.35,
      "Outbound Traffic Rate": 1533.44,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.283675918
    },
    {
      "Date": "8/24/2019",
      "Time": "12:16:00 PM",
      "Inbound Traffic Rate": 4.20563,
      "Outbound Traffic Rate": 1508.109952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.278867598
    },
    {
      "Date": "8/24/2019",
      "Time": "12:21:00 PM",
      "Inbound Traffic Rate": 4.80358,
      "Outbound Traffic Rate": 1457.580032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.329558576
    },
    {
      "Date": "8/24/2019",
      "Time": "12:26:00 PM",
      "Inbound Traffic Rate": 4.64655,
      "Outbound Traffic Rate": 1489.560064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.311941097
    },
    {
      "Date": "8/24/2019",
      "Time": "12:31:00 PM",
      "Inbound Traffic Rate": 4.48268,
      "Outbound Traffic Rate": 1436.56,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.312042657
    },
    {
      "Date": "8/24/2019",
      "Time": "12:36:00 PM",
      "Inbound Traffic Rate": 5.07477,
      "Outbound Traffic Rate": 1487.320064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.341202282
    },
    {
      "Date": "8/24/2019",
      "Time": "12:41:00 PM",
      "Inbound Traffic Rate": 5.5824,
      "Outbound Traffic Rate": 1407.869952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.396513896
    },
    {
      "Date": "8/24/2019",
      "Time": "12:46:00 PM",
      "Inbound Traffic Rate": 4.76284,
      "Outbound Traffic Rate": 1427.12,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.333737878
    },
    {
      "Date": "8/24/2019",
      "Time": "12:51:00 PM",
      "Inbound Traffic Rate": 4.01521,
      "Outbound Traffic Rate": 1448.050048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.277283924
    },
    {
      "Date": "8/24/2019",
      "Time": "12:56:00 PM",
      "Inbound Traffic Rate": 5.29628,
      "Outbound Traffic Rate": 1472.989952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.359559819
    },
    {
      "Date": "8/24/2019",
      "Time": "1:01:00 PM",
      "Inbound Traffic Rate": 4.78891,
      "Outbound Traffic Rate": 1451.580032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.32991016
    },
    {
      "Date": "8/24/2019",
      "Time": "1:06:00 PM",
      "Inbound Traffic Rate": 4.7674,
      "Outbound Traffic Rate": 1433.28,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.332621679
    },
    {
      "Date": "8/24/2019",
      "Time": "1:11:00 PM",
      "Inbound Traffic Rate": 4.59075,
      "Outbound Traffic Rate": 1451.410048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.316295867
    },
    {
      "Date": "8/24/2019",
      "Time": "1:16:00 PM",
      "Inbound Traffic Rate": 3.87229,
      "Outbound Traffic Rate": 1526.610048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.253652857
    },
    {
      "Date": "8/24/2019",
      "Time": "1:21:00 PM",
      "Inbound Traffic Rate": 3.67101,
      "Outbound Traffic Rate": 1508.269952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.243392106
    },
    {
      "Date": "8/24/2019",
      "Time": "1:26:00 PM",
      "Inbound Traffic Rate": 3.79124,
      "Outbound Traffic Rate": 1519.689984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.249474567
    },
    {
      "Date": "8/24/2019",
      "Time": "1:31:00 PM",
      "Inbound Traffic Rate": 3.71444,
      "Outbound Traffic Rate": 1545.720064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.240304832
    },
    {
      "Date": "8/24/2019",
      "Time": "1:36:00 PM",
      "Inbound Traffic Rate": 5.15637,
      "Outbound Traffic Rate": 1486.680064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.346837906
    },
    {
      "Date": "8/24/2019",
      "Time": "1:41:00 PM",
      "Inbound Traffic Rate": 4.08412,
      "Outbound Traffic Rate": 1544.199936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.264481296
    },
    {
      "Date": "8/24/2019",
      "Time": "1:46:00 PM",
      "Inbound Traffic Rate": 3.9135,
      "Outbound Traffic Rate": 1507.160064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.259660543
    },
    {
      "Date": "8/24/2019",
      "Time": "1:51:00 PM",
      "Inbound Traffic Rate": 3.79571,
      "Outbound Traffic Rate": 1456.199936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.260658575
    },
    {
      "Date": "8/24/2019",
      "Time": "1:56:00 PM",
      "Inbound Traffic Rate": 4.09951,
      "Outbound Traffic Rate": 1374.950016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.29815702
    },
    {
      "Date": "8/24/2019",
      "Time": "2:01:00 PM",
      "Inbound Traffic Rate": 3.65006,
      "Outbound Traffic Rate": 1436.220032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.25414351
    },
    {
      "Date": "8/24/2019",
      "Time": "2:06:00 PM",
      "Inbound Traffic Rate": 4.14611,
      "Outbound Traffic Rate": 1433.379968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.289254077
    },
    {
      "Date": "8/24/2019",
      "Time": "2:11:00 PM",
      "Inbound Traffic Rate": 4.51322,
      "Outbound Traffic Rate": 1398.899968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.322626357
    },
    {
      "Date": "8/24/2019",
      "Time": "2:16:00 PM",
      "Inbound Traffic Rate": 4.70006,
      "Outbound Traffic Rate": 1398.780032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.336011374
    },
    {
      "Date": "8/24/2019",
      "Time": "2:21:00 PM",
      "Inbound Traffic Rate": 4.26404,
      "Outbound Traffic Rate": 1407.170048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.303022368
    },
    {
      "Date": "8/24/2019",
      "Time": "2:26:00 PM",
      "Inbound Traffic Rate": 4.46505,
      "Outbound Traffic Rate": 1459.299968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.305972048
    },
    {
      "Date": "8/24/2019",
      "Time": "2:31:00 PM",
      "Inbound Traffic Rate": 4.03981,
      "Outbound Traffic Rate": 1430.189952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.282466675
    },
    {
      "Date": "8/24/2019",
      "Time": "2:36:00 PM",
      "Inbound Traffic Rate": 3.65215,
      "Outbound Traffic Rate": 1478.32,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.247047324
    },
    {
      "Date": "8/24/2019",
      "Time": "2:41:00 PM",
      "Inbound Traffic Rate": 4.25276,
      "Outbound Traffic Rate": 1560.329984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.272555167
    },
    {
      "Date": "8/24/2019",
      "Time": "2:46:00 PM",
      "Inbound Traffic Rate": 5.79372,
      "Outbound Traffic Rate": 1569.910016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.369047903
    },
    {
      "Date": "8/24/2019",
      "Time": "2:51:00 PM",
      "Inbound Traffic Rate": 6.20138,
      "Outbound Traffic Rate": 1544.060032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.401628167
    },
    {
      "Date": "8/24/2019",
      "Time": "2:56:00 PM",
      "Inbound Traffic Rate": 5.12668,
      "Outbound Traffic Rate": 1547.820032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.331219386
    },
    {
      "Date": "8/24/2019",
      "Time": "3:01:00 PM",
      "Inbound Traffic Rate": 5.03591,
      "Outbound Traffic Rate": 1527.789952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.329620573
    },
    {
      "Date": "8/24/2019",
      "Time": "3:06:00 PM",
      "Inbound Traffic Rate": 4.04274,
      "Outbound Traffic Rate": 1528.08,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.264563374
    },
    {
      "Date": "8/24/2019",
      "Time": "3:11:00 PM",
      "Inbound Traffic Rate": 3.90273,
      "Outbound Traffic Rate": 1514.499968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.257690993
    },
    {
      "Date": "8/24/2019",
      "Time": "3:16:00 PM",
      "Inbound Traffic Rate": 3.94855,
      "Outbound Traffic Rate": 1486.290048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.265664835
    },
    {
      "Date": "8/24/2019",
      "Time": "3:21:00 PM",
      "Inbound Traffic Rate": 3.99004,
      "Outbound Traffic Rate": 1547.879936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.257774515
    },
    {
      "Date": "8/24/2019",
      "Time": "3:26:00 PM",
      "Inbound Traffic Rate": 3.68672,
      "Outbound Traffic Rate": 1553.469952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.237321616
    },
    {
      "Date": "8/24/2019",
      "Time": "3:31:00 PM",
      "Inbound Traffic Rate": 3.50645,
      "Outbound Traffic Rate": 1601.139968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.218997094
    },
    {
      "Date": "8/24/2019",
      "Time": "3:36:00 PM",
      "Inbound Traffic Rate": 3.61268,
      "Outbound Traffic Rate": 1563.52,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.231060684
    },
    {
      "Date": "8/24/2019",
      "Time": "3:41:00 PM",
      "Inbound Traffic Rate": 3.81199,
      "Outbound Traffic Rate": 1571.090048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.242633451
    },
    {
      "Date": "8/24/2019",
      "Time": "3:46:00 PM",
      "Inbound Traffic Rate": 3.64906,
      "Outbound Traffic Rate": 1524.48,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.239364242
    },
    {
      "Date": "8/24/2019",
      "Time": "3:51:00 PM",
      "Inbound Traffic Rate": 3.29438,
      "Outbound Traffic Rate": 1545.849984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.213111236
    },
    {
      "Date": "8/24/2019",
      "Time": "3:56:00 PM",
      "Inbound Traffic Rate": 3.84034,
      "Outbound Traffic Rate": 1562.940032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.245712562
    },
    {
      "Date": "8/24/2019",
      "Time": "4:01:00 PM",
      "Inbound Traffic Rate": 4.81692,
      "Outbound Traffic Rate": 1592.499968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.302475359
    },
    {
      "Date": "8/24/2019",
      "Time": "4:06:00 PM",
      "Inbound Traffic Rate": 4.87773,
      "Outbound Traffic Rate": 1583.84,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.307968608
    },
    {
      "Date": "8/24/2019",
      "Time": "4:11:00 PM",
      "Inbound Traffic Rate": 3.86655,
      "Outbound Traffic Rate": 1527.44,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.25313924
    },
    {
      "Date": "8/24/2019",
      "Time": "4:16:00 PM",
      "Inbound Traffic Rate": 4.24646,
      "Outbound Traffic Rate": 1512.349952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.280785541
    },
    {
      "Date": "8/24/2019",
      "Time": "4:21:00 PM",
      "Inbound Traffic Rate": 3.97211,
      "Outbound Traffic Rate": 1508.64,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.263290778
    },
    {
      "Date": "8/24/2019",
      "Time": "4:26:00 PM",
      "Inbound Traffic Rate": 4.00663,
      "Outbound Traffic Rate": 1497.410048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.267570663
    },
    {
      "Date": "8/24/2019",
      "Time": "4:31:00 PM",
      "Inbound Traffic Rate": 3.99556,
      "Outbound Traffic Rate": 1469.650048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.271871525
    },
    {
      "Date": "8/24/2019",
      "Time": "4:36:00 PM",
      "Inbound Traffic Rate": 4.69443,
      "Outbound Traffic Rate": 1454.56,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.322738835
    },
    {
      "Date": "8/24/2019",
      "Time": "4:41:00 PM",
      "Inbound Traffic Rate": 4.49195,
      "Outbound Traffic Rate": 1484.870016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.302514695
    },
    {
      "Date": "8/24/2019",
      "Time": "4:46:00 PM",
      "Inbound Traffic Rate": 4.08318,
      "Outbound Traffic Rate": 1388.860032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.293995068
    },
    {
      "Date": "8/24/2019",
      "Time": "4:51:00 PM",
      "Inbound Traffic Rate": 4.15727,
      "Outbound Traffic Rate": 1384.690048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.300231088
    },
    {
      "Date": "8/24/2019",
      "Time": "4:56:00 PM",
      "Inbound Traffic Rate": 4.16499,
      "Outbound Traffic Rate": 1481.459968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.281140908
    },
    {
      "Date": "8/24/2019",
      "Time": "5:01:00 PM",
      "Inbound Traffic Rate": 4.12983,
      "Outbound Traffic Rate": 1490.950016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.276993189
    },
    {
      "Date": "8/24/2019",
      "Time": "5:06:00 PM",
      "Inbound Traffic Rate": 4.02362,
      "Outbound Traffic Rate": 1478.339968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.272171496
    },
    {
      "Date": "8/24/2019",
      "Time": "5:11:00 PM",
      "Inbound Traffic Rate": 3.81898,
      "Outbound Traffic Rate": 1438.249984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.26552964
    },
    {
      "Date": "8/24/2019",
      "Time": "5:16:00 PM",
      "Inbound Traffic Rate": 4.00343,
      "Outbound Traffic Rate": 1487.929984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.269060375
    },
    {
      "Date": "8/24/2019",
      "Time": "5:21:00 PM",
      "Inbound Traffic Rate": 3.70065,
      "Outbound Traffic Rate": 1471.6,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.251471188
    },
    {
      "Date": "8/24/2019",
      "Time": "5:26:00 PM",
      "Inbound Traffic Rate": 3.79087,
      "Outbound Traffic Rate": 1494.220032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.253702261
    },
    {
      "Date": "8/24/2019",
      "Time": "5:31:00 PM",
      "Inbound Traffic Rate": 4.07006,
      "Outbound Traffic Rate": 1520.749952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.267635057
    },
    {
      "Date": "8/24/2019",
      "Time": "5:36:00 PM",
      "Inbound Traffic Rate": 4.00035,
      "Outbound Traffic Rate": 1517.910016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.26354329
    },
    {
      "Date": "8/24/2019",
      "Time": "5:41:00 PM",
      "Inbound Traffic Rate": 4.09396,
      "Outbound Traffic Rate": 1466.840064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.27910064
    },
    {
      "Date": "8/24/2019",
      "Time": "5:46:00 PM",
      "Inbound Traffic Rate": 4.34129,
      "Outbound Traffic Rate": 1480.24,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.293282846
    },
    {
      "Date": "8/24/2019",
      "Time": "5:51:00 PM",
      "Inbound Traffic Rate": 3.96014,
      "Outbound Traffic Rate": 1471.76,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.269075121
    },
    {
      "Date": "8/24/2019",
      "Time": "5:56:00 PM",
      "Inbound Traffic Rate": 4.63565,
      "Outbound Traffic Rate": 1501.510016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.308732539
    },
    {
      "Date": "8/24/2019",
      "Time": "6:01:00 PM",
      "Inbound Traffic Rate": 5.15065,
      "Outbound Traffic Rate": 1453.670016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.35432044
    },
    {
      "Date": "8/24/2019",
      "Time": "6:06:00 PM",
      "Inbound Traffic Rate": 5.29574,
      "Outbound Traffic Rate": 1517.44,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.348991723
    },
    {
      "Date": "8/24/2019",
      "Time": "6:11:00 PM",
      "Inbound Traffic Rate": 5.10537,
      "Outbound Traffic Rate": 1497.609984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.340901173
    },
    {
      "Date": "8/24/2019",
      "Time": "6:16:00 PM",
      "Inbound Traffic Rate": 5.20724,
      "Outbound Traffic Rate": 1516.979968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.343263597
    },
    {
      "Date": "8/24/2019",
      "Time": "6:21:00 PM",
      "Inbound Traffic Rate": 5.11444,
      "Outbound Traffic Rate": 1585.289984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.322618578
    },
    {
      "Date": "8/24/2019",
      "Time": "6:26:00 PM",
      "Inbound Traffic Rate": 4.46154,
      "Outbound Traffic Rate": 1534.08,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.290828379
    },
    {
      "Date": "8/24/2019",
      "Time": "6:31:00 PM",
      "Inbound Traffic Rate": 4.52525,
      "Outbound Traffic Rate": 1492.269952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.303246071
    },
    {
      "Date": "8/24/2019",
      "Time": "6:36:00 PM",
      "Inbound Traffic Rate": 4.87681,
      "Outbound Traffic Rate": 1493.609984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.32651161
    },
    {
      "Date": "8/24/2019",
      "Time": "6:41:00 PM",
      "Inbound Traffic Rate": 4.01011,
      "Outbound Traffic Rate": 1500.899968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.267180364
    },
    {
      "Date": "8/24/2019",
      "Time": "6:46:00 PM",
      "Inbound Traffic Rate": 4.21991,
      "Outbound Traffic Rate": 1505.12,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.280370336
    },
    {
      "Date": "8/24/2019",
      "Time": "6:51:00 PM",
      "Inbound Traffic Rate": 4.15426,
      "Outbound Traffic Rate": 1489.449984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.278912353
    },
    {
      "Date": "8/24/2019",
      "Time": "6:56:00 PM",
      "Inbound Traffic Rate": 4.23127,
      "Outbound Traffic Rate": 1451.2,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.291570424
    },
    {
      "Date": "8/24/2019",
      "Time": "7:01:00 PM",
      "Inbound Traffic Rate": 4.09761,
      "Outbound Traffic Rate": 1484.989952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.2759352
    },
    {
      "Date": "8/24/2019",
      "Time": "7:06:00 PM",
      "Inbound Traffic Rate": 3.74838,
      "Outbound Traffic Rate": 1496.96,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.250399476
    },
    {
      "Date": "8/24/2019",
      "Time": "7:11:00 PM",
      "Inbound Traffic Rate": 3.89417,
      "Outbound Traffic Rate": 1487.869952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.261727848
    },
    {
      "Date": "8/24/2019",
      "Time": "7:16:00 PM",
      "Inbound Traffic Rate": 4.11414,
      "Outbound Traffic Rate": 1486.599936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.276748297
    },
    {
      "Date": "8/24/2019",
      "Time": "7:21:00 PM",
      "Inbound Traffic Rate": 4.09565,
      "Outbound Traffic Rate": 1538.249984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.266253863
    },
    {
      "Date": "8/24/2019",
      "Time": "7:26:00 PM",
      "Inbound Traffic Rate": 3.86378,
      "Outbound Traffic Rate": 1539.830016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.250922502
    },
    {
      "Date": "8/24/2019",
      "Time": "7:31:00 PM",
      "Inbound Traffic Rate": 4.08132,
      "Outbound Traffic Rate": 1607.800064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.253844995
    },
    {
      "Date": "8/24/2019",
      "Time": "7:36:00 PM",
      "Inbound Traffic Rate": 3.80062,
      "Outbound Traffic Rate": 1596.339968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.23808337
    },
    {
      "Date": "8/24/2019",
      "Time": "7:41:00 PM",
      "Inbound Traffic Rate": 3.85129,
      "Outbound Traffic Rate": 1587.84,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.242548997
    },
    {
      "Date": "8/24/2019",
      "Time": "7:46:00 PM",
      "Inbound Traffic Rate": 4.53426,
      "Outbound Traffic Rate": 1631.389952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.277938453
    },
    {
      "Date": "8/24/2019",
      "Time": "7:51:00 PM",
      "Inbound Traffic Rate": 4.24475,
      "Outbound Traffic Rate": 1583.619968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.26804095
    },
    {
      "Date": "8/24/2019",
      "Time": "7:56:00 PM",
      "Inbound Traffic Rate": 3.86757,
      "Outbound Traffic Rate": 1597.849984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.24204838
    },
    {
      "Date": "8/24/2019",
      "Time": "8:01:00 PM",
      "Inbound Traffic Rate": 3.45572,
      "Outbound Traffic Rate": 1550.610048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.222861964
    },
    {
      "Date": "8/24/2019",
      "Time": "8:06:00 PM",
      "Inbound Traffic Rate": 3.61296,
      "Outbound Traffic Rate": 1636.179968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.220816785
    },
    {
      "Date": "8/24/2019",
      "Time": "8:11:00 PM",
      "Inbound Traffic Rate": 3.26819,
      "Outbound Traffic Rate": 1607.900032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.203258283
    },
    {
      "Date": "8/24/2019",
      "Time": "8:16:00 PM",
      "Inbound Traffic Rate": 3.40664,
      "Outbound Traffic Rate": 1592.930048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.213859987
    },
    {
      "Date": "8/24/2019",
      "Time": "8:21:00 PM",
      "Inbound Traffic Rate": 3.35143,
      "Outbound Traffic Rate": 1554.24,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.215631434
    },
    {
      "Date": "8/24/2019",
      "Time": "8:26:00 PM",
      "Inbound Traffic Rate": 3.71635,
      "Outbound Traffic Rate": 1604.88,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.2315656
    },
    {
      "Date": "8/24/2019",
      "Time": "8:31:00 PM",
      "Inbound Traffic Rate": 3.44421,
      "Outbound Traffic Rate": 1648.499968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.20892994
    },
    {
      "Date": "8/24/2019",
      "Time": "8:36:00 PM",
      "Inbound Traffic Rate": 3.57165,
      "Outbound Traffic Rate": 1661.020032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.215027509
    },
    {
      "Date": "8/24/2019",
      "Time": "8:41:00 PM",
      "Inbound Traffic Rate": 3.81638,
      "Outbound Traffic Rate": 1659.030016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.230036827
    },
    {
      "Date": "8/24/2019",
      "Time": "8:46:00 PM",
      "Inbound Traffic Rate": 3.51358,
      "Outbound Traffic Rate": 1724.140032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.203787392
    },
    {
      "Date": "8/24/2019",
      "Time": "8:51:00 PM",
      "Inbound Traffic Rate": 3.42609,
      "Outbound Traffic Rate": 1681.410048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.203762907
    },
    {
      "Date": "8/24/2019",
      "Time": "8:56:00 PM",
      "Inbound Traffic Rate": 3.44745,
      "Outbound Traffic Rate": 1663.629952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.207224569
    },
    {
      "Date": "8/24/2019",
      "Time": "9:01:00 PM",
      "Inbound Traffic Rate": 3.17123,
      "Outbound Traffic Rate": 1627.750016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.194822913
    },
    {
      "Date": "8/24/2019",
      "Time": "9:06:00 PM",
      "Inbound Traffic Rate": 3.08224,
      "Outbound Traffic Rate": 1691.350016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.182235491
    },
    {
      "Date": "8/24/2019",
      "Time": "9:11:00 PM",
      "Inbound Traffic Rate": 3.08112,
      "Outbound Traffic Rate": 1653.289984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.186362951
    },
    {
      "Date": "8/24/2019",
      "Time": "9:16:00 PM",
      "Inbound Traffic Rate": 3.27648,
      "Outbound Traffic Rate": 1616.780032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.202654655
    },
    {
      "Date": "8/24/2019",
      "Time": "9:21:00 PM",
      "Inbound Traffic Rate": 3.95183,
      "Outbound Traffic Rate": 1655.68,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.2386832
    },
    {
      "Date": "8/24/2019",
      "Time": "9:26:00 PM",
      "Inbound Traffic Rate": 3.725,
      "Outbound Traffic Rate": 1689.539968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.220474216
    },
    {
      "Date": "8/24/2019",
      "Time": "9:31:00 PM",
      "Inbound Traffic Rate": 3.8485,
      "Outbound Traffic Rate": 1671.480064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.230245043
    },
    {
      "Date": "8/24/2019",
      "Time": "9:36:00 PM",
      "Inbound Traffic Rate": 3.63784,
      "Outbound Traffic Rate": 1675.320064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.217142985
    },
    {
      "Date": "8/24/2019",
      "Time": "9:41:00 PM",
      "Inbound Traffic Rate": 3.52104,
      "Outbound Traffic Rate": 1680.749952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.209492197
    },
    {
      "Date": "8/24/2019",
      "Time": "9:46:00 PM",
      "Inbound Traffic Rate": 4.20447,
      "Outbound Traffic Rate": 1671.379968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.251556802
    },
    {
      "Date": "8/24/2019",
      "Time": "9:51:00 PM",
      "Inbound Traffic Rate": 4.5438,
      "Outbound Traffic Rate": 1679.869952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.270485224
    },
    {
      "Date": "8/24/2019",
      "Time": "9:56:00 PM",
      "Inbound Traffic Rate": 4.20446,
      "Outbound Traffic Rate": 1716.780032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.244903827
    },
    {
      "Date": "8/24/2019",
      "Time": "10:01:00 PM",
      "Inbound Traffic Rate": 3.46275,
      "Outbound Traffic Rate": 1727.830016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.200410339
    },
    {
      "Date": "8/24/2019",
      "Time": "10:06:00 PM",
      "Inbound Traffic Rate": 3.50802,
      "Outbound Traffic Rate": 1677.740032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.209091989
    },
    {
      "Date": "8/24/2019",
      "Time": "10:11:00 PM",
      "Inbound Traffic Rate": 3.48887,
      "Outbound Traffic Rate": 1734.739968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.20111775
    },
    {
      "Date": "8/24/2019",
      "Time": "10:16:00 PM",
      "Inbound Traffic Rate": 3.31488,
      "Outbound Traffic Rate": 1686.390016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.196566629
    },
    {
      "Date": "8/24/2019",
      "Time": "10:21:00 PM",
      "Inbound Traffic Rate": 3.77122,
      "Outbound Traffic Rate": 1630.870016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.231239765
    },
    {
      "Date": "8/24/2019",
      "Time": "10:26:00 PM",
      "Inbound Traffic Rate": 3.61099,
      "Outbound Traffic Rate": 1647.459968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.219185296
    },
    {
      "Date": "8/24/2019",
      "Time": "10:31:00 PM",
      "Inbound Traffic Rate": 3.86399,
      "Outbound Traffic Rate": 1688.210048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.228880879
    },
    {
      "Date": "8/24/2019",
      "Time": "10:36:00 PM",
      "Inbound Traffic Rate": 3.88085,
      "Outbound Traffic Rate": 1678.140032,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.231259009
    },
    {
      "Date": "8/24/2019",
      "Time": "10:41:00 PM",
      "Inbound Traffic Rate": 3.94697,
      "Outbound Traffic Rate": 1618.040064,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.243935245
    },
    {
      "Date": "8/24/2019",
      "Time": "10:46:00 PM",
      "Inbound Traffic Rate": 4.05013,
      "Outbound Traffic Rate": 1590.32,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.254673902
    },
    {
      "Date": "8/24/2019",
      "Time": "10:51:00 PM",
      "Inbound Traffic Rate": 3.83918,
      "Outbound Traffic Rate": 1547.219968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.248134078
    },
    {
      "Date": "8/24/2019",
      "Time": "10:56:00 PM",
      "Inbound Traffic Rate": 3.95894,
      "Outbound Traffic Rate": 1553.510016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.254838396
    },
    {
      "Date": "8/24/2019",
      "Time": "11:01:00 PM",
      "Inbound Traffic Rate": 4.37791,
      "Outbound Traffic Rate": 1538.419968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.284571839
    },
    {
      "Date": "8/24/2019",
      "Time": "11:06:00 PM",
      "Inbound Traffic Rate": 4.00299,
      "Outbound Traffic Rate": 1469.330048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.272436408
    },
    {
      "Date": "8/24/2019",
      "Time": "11:11:00 PM",
      "Inbound Traffic Rate": 3.6202,
      "Outbound Traffic Rate": 1467.709952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.246656364
    },
    {
      "Date": "8/24/2019",
      "Time": "11:16:00 PM",
      "Inbound Traffic Rate": 3.49039,
      "Outbound Traffic Rate": 1478.969984,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.236001409
    },
    {
      "Date": "8/24/2019",
      "Time": "11:21:00 PM",
      "Inbound Traffic Rate": 3.76343,
      "Outbound Traffic Rate": 1479.549952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.254363159
    },
    {
      "Date": "8/24/2019",
      "Time": "11:26:00 PM",
      "Inbound Traffic Rate": 3.73417,
      "Outbound Traffic Rate": 1451.030016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.257346158
    },
    {
      "Date": "8/24/2019",
      "Time": "11:31:00 PM",
      "Inbound Traffic Rate": 3.36024,
      "Outbound Traffic Rate": 1514.439936,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.221880044
    },
    {
      "Date": "8/24/2019",
      "Time": "11:36:00 PM",
      "Inbound Traffic Rate": 3.30132,
      "Outbound Traffic Rate": 1485.28,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.222269202
    },
    {
      "Date": "8/24/2019",
      "Time": "11:41:00 PM",
      "Inbound Traffic Rate": 3.46142,
      "Outbound Traffic Rate": 1451.709952,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.238437437
    },
    {
      "Date": "8/24/2019",
      "Time": "11:46:00 PM",
      "Inbound Traffic Rate": 3.97081,
      "Outbound Traffic Rate": 1489.970048,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.266502673
    },
    {
      "Date": "8/24/2019",
      "Time": "11:51:00 PM",
      "Inbound Traffic Rate": 4.19862,
      "Outbound Traffic Rate": 1468.070016,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.285995896
    },
    {
      "Date": "8/24/2019",
      "Time": "11:56:00 PM",
      "Inbound Traffic Rate": 4.28413,
      "Outbound Traffic Rate": 1446.419968,
      "Day of Week": "Saturday",
      "Traffic Ratio": 0.296188527
    },
    {
      "Date": "8/25/2019",
      "Time": "12:01:00 AM",
      "Inbound Traffic Rate": 4.62098,
      "Outbound Traffic Rate": 1412.089984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.327244018
    },
    {
      "Date": "8/25/2019",
      "Time": "12:06:00 AM",
      "Inbound Traffic Rate": 4.37836,
      "Outbound Traffic Rate": 1396.460032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.313532783
    },
    {
      "Date": "8/25/2019",
      "Time": "12:11:00 AM",
      "Inbound Traffic Rate": 4.13444,
      "Outbound Traffic Rate": 1404.809984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.294305995
    },
    {
      "Date": "8/25/2019",
      "Time": "12:16:00 AM",
      "Inbound Traffic Rate": 3.5436,
      "Outbound Traffic Rate": 1381.250048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.256550217
    },
    {
      "Date": "8/25/2019",
      "Time": "12:21:00 AM",
      "Inbound Traffic Rate": 3.83731,
      "Outbound Traffic Rate": 1344.96,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.285310344
    },
    {
      "Date": "8/25/2019",
      "Time": "12:26:00 AM",
      "Inbound Traffic Rate": 3.59497,
      "Outbound Traffic Rate": 1297.180032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.277137322
    },
    {
      "Date": "8/25/2019",
      "Time": "12:31:00 AM",
      "Inbound Traffic Rate": 3.63448,
      "Outbound Traffic Rate": 1343.049984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.270613904
    },
    {
      "Date": "8/25/2019",
      "Time": "12:36:00 AM",
      "Inbound Traffic Rate": 3.04613,
      "Outbound Traffic Rate": 1284.649984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.237117506
    },
    {
      "Date": "8/25/2019",
      "Time": "12:41:00 AM",
      "Inbound Traffic Rate": 2.90088,
      "Outbound Traffic Rate": 1250.739968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.231933102
    },
    {
      "Date": "8/25/2019",
      "Time": "12:46:00 AM",
      "Inbound Traffic Rate": 3.29278,
      "Outbound Traffic Rate": 1198.349952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.274776162
    },
    {
      "Date": "8/25/2019",
      "Time": "12:51:00 AM",
      "Inbound Traffic Rate": 3.40582,
      "Outbound Traffic Rate": 1257.52,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.270836249
    },
    {
      "Date": "8/25/2019",
      "Time": "12:56:00 AM",
      "Inbound Traffic Rate": 3.79559,
      "Outbound Traffic Rate": 1211.270016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.313356225
    },
    {
      "Date": "8/25/2019",
      "Time": "1:01:00 AM",
      "Inbound Traffic Rate": 4.09977,
      "Outbound Traffic Rate": 1224.839936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.334718838
    },
    {
      "Date": "8/25/2019",
      "Time": "1:06:00 AM",
      "Inbound Traffic Rate": 4.38232,
      "Outbound Traffic Rate": 1264.930048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.346447616
    },
    {
      "Date": "8/25/2019",
      "Time": "1:11:00 AM",
      "Inbound Traffic Rate": 4.4519,
      "Outbound Traffic Rate": 1249.849984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.356194748
    },
    {
      "Date": "8/25/2019",
      "Time": "1:16:00 AM",
      "Inbound Traffic Rate": 4.61901,
      "Outbound Traffic Rate": 1315.619968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.351089989
    },
    {
      "Date": "8/25/2019",
      "Time": "1:21:00 AM",
      "Inbound Traffic Rate": 4.15827,
      "Outbound Traffic Rate": 1293.660032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.321434527
    },
    {
      "Date": "8/25/2019",
      "Time": "1:26:00 AM",
      "Inbound Traffic Rate": 4.51289,
      "Outbound Traffic Rate": 1217.890048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.370549871
    },
    {
      "Date": "8/25/2019",
      "Time": "1:31:00 AM",
      "Inbound Traffic Rate": 4.11518,
      "Outbound Traffic Rate": 1167.369984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.352517202
    },
    {
      "Date": "8/25/2019",
      "Time": "1:36:00 AM",
      "Inbound Traffic Rate": 3.85205,
      "Outbound Traffic Rate": 1226.690048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.31401983
    },
    {
      "Date": "8/25/2019",
      "Time": "1:41:00 AM",
      "Inbound Traffic Rate": 3.87705,
      "Outbound Traffic Rate": 1147.139968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.337975322
    },
    {
      "Date": "8/25/2019",
      "Time": "1:46:00 AM",
      "Inbound Traffic Rate": 3.78611,
      "Outbound Traffic Rate": 1109.299968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.341306239
    },
    {
      "Date": "8/25/2019",
      "Time": "1:51:00 AM",
      "Inbound Traffic Rate": 3.93121,
      "Outbound Traffic Rate": 1117.490048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.351789263
    },
    {
      "Date": "8/25/2019",
      "Time": "1:56:00 AM",
      "Inbound Traffic Rate": 4.43971,
      "Outbound Traffic Rate": 1045.729984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.424556058
    },
    {
      "Date": "8/25/2019",
      "Time": "2:01:00 AM",
      "Inbound Traffic Rate": 4.25763,
      "Outbound Traffic Rate": 1022.889984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.416235379
    },
    {
      "Date": "8/25/2019",
      "Time": "2:06:00 AM",
      "Inbound Traffic Rate": 4.74179,
      "Outbound Traffic Rate": 1035.059968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.458117418
    },
    {
      "Date": "8/25/2019",
      "Time": "2:11:00 AM",
      "Inbound Traffic Rate": 4.74207,
      "Outbound Traffic Rate": 1045.299968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.45365638
    },
    {
      "Date": "8/25/2019",
      "Time": "2:16:00 AM",
      "Inbound Traffic Rate": 4.31182,
      "Outbound Traffic Rate": 995.950016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.432935381
    },
    {
      "Date": "8/25/2019",
      "Time": "2:21:00 AM",
      "Inbound Traffic Rate": 3.74868,
      "Outbound Traffic Rate": 981.689984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.38185986
    },
    {
      "Date": "8/25/2019",
      "Time": "2:26:00 AM",
      "Inbound Traffic Rate": 3.48353,
      "Outbound Traffic Rate": 970.664,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.358881137
    },
    {
      "Date": "8/25/2019",
      "Time": "2:31:00 AM",
      "Inbound Traffic Rate": 3.66036,
      "Outbound Traffic Rate": 917.321984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.399026739
    },
    {
      "Date": "8/25/2019",
      "Time": "2:36:00 AM",
      "Inbound Traffic Rate": 3.60227,
      "Outbound Traffic Rate": 948.068992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.379958635
    },
    {
      "Date": "8/25/2019",
      "Time": "2:41:00 AM",
      "Inbound Traffic Rate": 3.71919,
      "Outbound Traffic Rate": 929.334016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.400199491
    },
    {
      "Date": "8/25/2019",
      "Time": "2:46:00 AM",
      "Inbound Traffic Rate": 3.22175,
      "Outbound Traffic Rate": 862.268992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.373636305
    },
    {
      "Date": "8/25/2019",
      "Time": "2:51:00 AM",
      "Inbound Traffic Rate": 3.44669,
      "Outbound Traffic Rate": 924.726976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.372725149
    },
    {
      "Date": "8/25/2019",
      "Time": "2:56:00 AM",
      "Inbound Traffic Rate": 3.162,
      "Outbound Traffic Rate": 901.857024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.350609899
    },
    {
      "Date": "8/25/2019",
      "Time": "3:01:00 AM",
      "Inbound Traffic Rate": 3.59406,
      "Outbound Traffic Rate": 858.534016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.41862756
    },
    {
      "Date": "8/25/2019",
      "Time": "3:06:00 AM",
      "Inbound Traffic Rate": 2.90995,
      "Outbound Traffic Rate": 826.523008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.352071264
    },
    {
      "Date": "8/25/2019",
      "Time": "3:11:00 AM",
      "Inbound Traffic Rate": 3.0633,
      "Outbound Traffic Rate": 836.166016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.366350694
    },
    {
      "Date": "8/25/2019",
      "Time": "3:16:00 AM",
      "Inbound Traffic Rate": 2.96445,
      "Outbound Traffic Rate": 823.961024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.359780367
    },
    {
      "Date": "8/25/2019",
      "Time": "3:21:00 AM",
      "Inbound Traffic Rate": 3.24545,
      "Outbound Traffic Rate": 803.652992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.403837232
    },
    {
      "Date": "8/25/2019",
      "Time": "3:26:00 AM",
      "Inbound Traffic Rate": 2.99471,
      "Outbound Traffic Rate": 851.283008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.351787828
    },
    {
      "Date": "8/25/2019",
      "Time": "3:31:00 AM",
      "Inbound Traffic Rate": 3.24104,
      "Outbound Traffic Rate": 825.841024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.392453257
    },
    {
      "Date": "8/25/2019",
      "Time": "3:36:00 AM",
      "Inbound Traffic Rate": 2.89349,
      "Outbound Traffic Rate": 787.817984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.367278998
    },
    {
      "Date": "8/25/2019",
      "Time": "3:41:00 AM",
      "Inbound Traffic Rate": 2.86052,
      "Outbound Traffic Rate": 778.662976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.367363043
    },
    {
      "Date": "8/25/2019",
      "Time": "3:46:00 AM",
      "Inbound Traffic Rate": 3.33256,
      "Outbound Traffic Rate": 735.494976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.453104387
    },
    {
      "Date": "8/25/2019",
      "Time": "3:51:00 AM",
      "Inbound Traffic Rate": 3.30073,
      "Outbound Traffic Rate": 718.870976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.459154718
    },
    {
      "Date": "8/25/2019",
      "Time": "3:56:00 AM",
      "Inbound Traffic Rate": 3.32735,
      "Outbound Traffic Rate": 725.937024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.458352431
    },
    {
      "Date": "8/25/2019",
      "Time": "4:01:00 AM",
      "Inbound Traffic Rate": 3.20337,
      "Outbound Traffic Rate": 758.676992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.422231072
    },
    {
      "Date": "8/25/2019",
      "Time": "4:06:00 AM",
      "Inbound Traffic Rate": 3.09608,
      "Outbound Traffic Rate": 764.819968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.404811607
    },
    {
      "Date": "8/25/2019",
      "Time": "4:11:00 AM",
      "Inbound Traffic Rate": 2.51855,
      "Outbound Traffic Rate": 769.201984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.327423752
    },
    {
      "Date": "8/25/2019",
      "Time": "4:16:00 AM",
      "Inbound Traffic Rate": 2.7213,
      "Outbound Traffic Rate": 755.086976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.360395569
    },
    {
      "Date": "8/25/2019",
      "Time": "4:21:00 AM",
      "Inbound Traffic Rate": 2.8629,
      "Outbound Traffic Rate": 798.211008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.35866456
    },
    {
      "Date": "8/25/2019",
      "Time": "4:26:00 AM",
      "Inbound Traffic Rate": 2.8562,
      "Outbound Traffic Rate": 790.908992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.361128781
    },
    {
      "Date": "8/25/2019",
      "Time": "4:31:00 AM",
      "Inbound Traffic Rate": 2.42595,
      "Outbound Traffic Rate": 763.964032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.317547672
    },
    {
      "Date": "8/25/2019",
      "Time": "4:36:00 AM",
      "Inbound Traffic Rate": 2.4966,
      "Outbound Traffic Rate": 755.027008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.330663668
    },
    {
      "Date": "8/25/2019",
      "Time": "4:41:00 AM",
      "Inbound Traffic Rate": 2.58432,
      "Outbound Traffic Rate": 747.638016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.345664606
    },
    {
      "Date": "8/25/2019",
      "Time": "4:46:00 AM",
      "Inbound Traffic Rate": 2.32278,
      "Outbound Traffic Rate": 732.556992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.317078401
    },
    {
      "Date": "8/25/2019",
      "Time": "4:51:00 AM",
      "Inbound Traffic Rate": 2.70717,
      "Outbound Traffic Rate": 746.307968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.362741672
    },
    {
      "Date": "8/25/2019",
      "Time": "4:56:00 AM",
      "Inbound Traffic Rate": 2.69925,
      "Outbound Traffic Rate": 719.008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.375413069
    },
    {
      "Date": "8/25/2019",
      "Time": "5:01:00 AM",
      "Inbound Traffic Rate": 2.62276,
      "Outbound Traffic Rate": 707.001024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.37096976
    },
    {
      "Date": "8/25/2019",
      "Time": "5:06:00 AM",
      "Inbound Traffic Rate": 2.98432,
      "Outbound Traffic Rate": 712.444032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.418884834
    },
    {
      "Date": "8/25/2019",
      "Time": "5:11:00 AM",
      "Inbound Traffic Rate": 2.44953,
      "Outbound Traffic Rate": 772.776,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.316978012
    },
    {
      "Date": "8/25/2019",
      "Time": "5:16:00 AM",
      "Inbound Traffic Rate": 2.51892,
      "Outbound Traffic Rate": 781.465024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.322333044
    },
    {
      "Date": "8/25/2019",
      "Time": "5:21:00 AM",
      "Inbound Traffic Rate": 2.66485,
      "Outbound Traffic Rate": 779.169984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.342011378
    },
    {
      "Date": "8/25/2019",
      "Time": "5:26:00 AM",
      "Inbound Traffic Rate": 2.78473,
      "Outbound Traffic Rate": 736.401024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.37815401
    },
    {
      "Date": "8/25/2019",
      "Time": "5:31:00 AM",
      "Inbound Traffic Rate": 2.45154,
      "Outbound Traffic Rate": 747.267008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.328067474
    },
    {
      "Date": "8/25/2019",
      "Time": "5:36:00 AM",
      "Inbound Traffic Rate": 2.21218,
      "Outbound Traffic Rate": 797.792,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.277287814
    },
    {
      "Date": "8/25/2019",
      "Time": "5:41:00 AM",
      "Inbound Traffic Rate": 2.9667,
      "Outbound Traffic Rate": 784.051968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.378380531
    },
    {
      "Date": "8/25/2019",
      "Time": "5:46:00 AM",
      "Inbound Traffic Rate": 2.93647,
      "Outbound Traffic Rate": 782.665024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.375188607
    },
    {
      "Date": "8/25/2019",
      "Time": "5:51:00 AM",
      "Inbound Traffic Rate": 3.02763,
      "Outbound Traffic Rate": 868.022976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.348796067
    },
    {
      "Date": "8/25/2019",
      "Time": "5:56:00 AM",
      "Inbound Traffic Rate": 3.28805,
      "Outbound Traffic Rate": 938.580992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.350321392
    },
    {
      "Date": "8/25/2019",
      "Time": "6:01:00 AM",
      "Inbound Traffic Rate": 3.20569,
      "Outbound Traffic Rate": 909.113984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.35261695
    },
    {
      "Date": "8/25/2019",
      "Time": "6:06:00 AM",
      "Inbound Traffic Rate": 3.31044,
      "Outbound Traffic Rate": 924.974976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.357895088
    },
    {
      "Date": "8/25/2019",
      "Time": "6:11:00 AM",
      "Inbound Traffic Rate": 3.88714,
      "Outbound Traffic Rate": 936.412032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.415110001
    },
    {
      "Date": "8/25/2019",
      "Time": "6:16:00 AM",
      "Inbound Traffic Rate": 3.84526,
      "Outbound Traffic Rate": 904.700032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.425031487
    },
    {
      "Date": "8/25/2019",
      "Time": "6:21:00 AM",
      "Inbound Traffic Rate": 3.77811,
      "Outbound Traffic Rate": 945.550016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.399567441
    },
    {
      "Date": "8/25/2019",
      "Time": "6:26:00 AM",
      "Inbound Traffic Rate": 3.4089,
      "Outbound Traffic Rate": 974.446016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.349829538
    },
    {
      "Date": "8/25/2019",
      "Time": "6:31:00 AM",
      "Inbound Traffic Rate": 3.37784,
      "Outbound Traffic Rate": 982.382016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.343841799
    },
    {
      "Date": "8/25/2019",
      "Time": "6:36:00 AM",
      "Inbound Traffic Rate": 3.96669,
      "Outbound Traffic Rate": 974.601984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.407006149
    },
    {
      "Date": "8/25/2019",
      "Time": "6:41:00 AM",
      "Inbound Traffic Rate": 4.53909,
      "Outbound Traffic Rate": 965.830016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.469967792
    },
    {
      "Date": "8/25/2019",
      "Time": "6:46:00 AM",
      "Inbound Traffic Rate": 4.68104,
      "Outbound Traffic Rate": 917.843008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.51000443
    },
    {
      "Date": "8/25/2019",
      "Time": "6:51:00 AM",
      "Inbound Traffic Rate": 2.72805,
      "Outbound Traffic Rate": 915.164992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.298093789
    },
    {
      "Date": "8/25/2019",
      "Time": "6:56:00 AM",
      "Inbound Traffic Rate": 3.29392,
      "Outbound Traffic Rate": 923.657984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.356616849
    },
    {
      "Date": "8/25/2019",
      "Time": "7:01:00 AM",
      "Inbound Traffic Rate": 3.23481,
      "Outbound Traffic Rate": 976.942016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.331115864
    },
    {
      "Date": "8/25/2019",
      "Time": "7:06:00 AM",
      "Inbound Traffic Rate": 2.21123,
      "Outbound Traffic Rate": 898.716032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.246043235
    },
    {
      "Date": "8/25/2019",
      "Time": "7:11:00 AM",
      "Inbound Traffic Rate": 2.32503,
      "Outbound Traffic Rate": 977.273984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.237909741
    },
    {
      "Date": "8/25/2019",
      "Time": "7:16:00 AM",
      "Inbound Traffic Rate": 2.36083,
      "Outbound Traffic Rate": 939.601024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.251258773
    },
    {
      "Date": "8/25/2019",
      "Time": "7:21:00 AM",
      "Inbound Traffic Rate": 2.4762,
      "Outbound Traffic Rate": 958.928,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.258225852
    },
    {
      "Date": "8/25/2019",
      "Time": "7:26:00 AM",
      "Inbound Traffic Rate": 2.96016,
      "Outbound Traffic Rate": 903.64,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.32758178
    },
    {
      "Date": "8/25/2019",
      "Time": "7:31:00 AM",
      "Inbound Traffic Rate": 2.45539,
      "Outbound Traffic Rate": 907.456,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.27057951
    },
    {
      "Date": "8/25/2019",
      "Time": "7:36:00 AM",
      "Inbound Traffic Rate": 2.57882,
      "Outbound Traffic Rate": 895.355008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.288022067
    },
    {
      "Date": "8/25/2019",
      "Time": "7:41:00 AM",
      "Inbound Traffic Rate": 2.76958,
      "Outbound Traffic Rate": 893.105984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.310106533
    },
    {
      "Date": "8/25/2019",
      "Time": "7:46:00 AM",
      "Inbound Traffic Rate": 2.43595,
      "Outbound Traffic Rate": 941.316992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.25878105
    },
    {
      "Date": "8/25/2019",
      "Time": "7:51:00 AM",
      "Inbound Traffic Rate": 3.04887,
      "Outbound Traffic Rate": 988.875008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.308317024
    },
    {
      "Date": "8/25/2019",
      "Time": "7:56:00 AM",
      "Inbound Traffic Rate": 2.66162,
      "Outbound Traffic Rate": 998.323008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.266609101
    },
    {
      "Date": "8/25/2019",
      "Time": "8:01:00 AM",
      "Inbound Traffic Rate": 2.69741,
      "Outbound Traffic Rate": 978.059008,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.275792153
    },
    {
      "Date": "8/25/2019",
      "Time": "8:06:00 AM",
      "Inbound Traffic Rate": 2.13171,
      "Outbound Traffic Rate": 926.537024,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.230072835
    },
    {
      "Date": "8/25/2019",
      "Time": "8:11:00 AM",
      "Inbound Traffic Rate": 2.86045,
      "Outbound Traffic Rate": 909.006976,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.314678553
    },
    {
      "Date": "8/25/2019",
      "Time": "8:16:00 AM",
      "Inbound Traffic Rate": 2.8656,
      "Outbound Traffic Rate": 959.081984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.298785719
    },
    {
      "Date": "8/25/2019",
      "Time": "8:21:00 AM",
      "Inbound Traffic Rate": 2.87276,
      "Outbound Traffic Rate": 955.742016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.300579022
    },
    {
      "Date": "8/25/2019",
      "Time": "8:26:00 AM",
      "Inbound Traffic Rate": 2.68346,
      "Outbound Traffic Rate": 915.380992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.293152253
    },
    {
      "Date": "8/25/2019",
      "Time": "8:31:00 AM",
      "Inbound Traffic Rate": 2.29337,
      "Outbound Traffic Rate": 922.004992,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.248737265
    },
    {
      "Date": "8/25/2019",
      "Time": "8:36:00 AM",
      "Inbound Traffic Rate": 2.40162,
      "Outbound Traffic Rate": 986.998016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.243325717
    },
    {
      "Date": "8/25/2019",
      "Time": "8:41:00 AM",
      "Inbound Traffic Rate": 2.7679,
      "Outbound Traffic Rate": 1000.110016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.276759552
    },
    {
      "Date": "8/25/2019",
      "Time": "8:46:00 AM",
      "Inbound Traffic Rate": 2.74443,
      "Outbound Traffic Rate": 1036.36,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.26481435
    },
    {
      "Date": "8/25/2019",
      "Time": "8:51:00 AM",
      "Inbound Traffic Rate": 2.58697,
      "Outbound Traffic Rate": 1055.929984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.244994464
    },
    {
      "Date": "8/25/2019",
      "Time": "8:56:00 AM",
      "Inbound Traffic Rate": 2.70294,
      "Outbound Traffic Rate": 1070.419968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.252512106
    },
    {
      "Date": "8/25/2019",
      "Time": "9:01:00 AM",
      "Inbound Traffic Rate": 2.43322,
      "Outbound Traffic Rate": 1139.510016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.213532129
    },
    {
      "Date": "8/25/2019",
      "Time": "9:06:00 AM",
      "Inbound Traffic Rate": 2.19332,
      "Outbound Traffic Rate": 1170.579968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.187370369
    },
    {
      "Date": "8/25/2019",
      "Time": "9:11:00 AM",
      "Inbound Traffic Rate": 2.46579,
      "Outbound Traffic Rate": 1166.840064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.211322021
    },
    {
      "Date": "8/25/2019",
      "Time": "9:16:00 AM",
      "Inbound Traffic Rate": 2.18275,
      "Outbound Traffic Rate": 1148.940032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.189979454
    },
    {
      "Date": "8/25/2019",
      "Time": "9:21:00 AM",
      "Inbound Traffic Rate": 2.28682,
      "Outbound Traffic Rate": 1116.519936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.204816764
    },
    {
      "Date": "8/25/2019",
      "Time": "9:26:00 AM",
      "Inbound Traffic Rate": 2.37732,
      "Outbound Traffic Rate": 1096.950016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.216720905
    },
    {
      "Date": "8/25/2019",
      "Time": "9:31:00 AM",
      "Inbound Traffic Rate": 2.99305,
      "Outbound Traffic Rate": 1174.4,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.2548578
    },
    {
      "Date": "8/25/2019",
      "Time": "9:36:00 AM",
      "Inbound Traffic Rate": 2.75699,
      "Outbound Traffic Rate": 1227.36,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.224627656
    },
    {
      "Date": "8/25/2019",
      "Time": "9:41:00 AM",
      "Inbound Traffic Rate": 2.91337,
      "Outbound Traffic Rate": 1178.119936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.247289763
    },
    {
      "Date": "8/25/2019",
      "Time": "9:46:00 AM",
      "Inbound Traffic Rate": 3.62678,
      "Outbound Traffic Rate": 1185.049984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.306044475
    },
    {
      "Date": "8/25/2019",
      "Time": "9:51:00 AM",
      "Inbound Traffic Rate": 3.55592,
      "Outbound Traffic Rate": 1209.229952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.29406483
    },
    {
      "Date": "8/25/2019",
      "Time": "9:56:00 AM",
      "Inbound Traffic Rate": 3.8528,
      "Outbound Traffic Rate": 1187.549952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.324432669
    },
    {
      "Date": "8/25/2019",
      "Time": "10:01:00 AM",
      "Inbound Traffic Rate": 3.67603,
      "Outbound Traffic Rate": 1242.599936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.295833751
    },
    {
      "Date": "8/25/2019",
      "Time": "10:06:00 AM",
      "Inbound Traffic Rate": 3.73572,
      "Outbound Traffic Rate": 1160.969984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.321775761
    },
    {
      "Date": "8/25/2019",
      "Time": "10:11:00 AM",
      "Inbound Traffic Rate": 3.04109,
      "Outbound Traffic Rate": 1246.119936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.244044727
    },
    {
      "Date": "8/25/2019",
      "Time": "10:16:00 AM",
      "Inbound Traffic Rate": 2.7957,
      "Outbound Traffic Rate": 1285.650048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.217454198
    },
    {
      "Date": "8/25/2019",
      "Time": "10:21:00 AM",
      "Inbound Traffic Rate": 2.86478,
      "Outbound Traffic Rate": 1299.000064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.220537326
    },
    {
      "Date": "8/25/2019",
      "Time": "10:26:00 AM",
      "Inbound Traffic Rate": 3.00987,
      "Outbound Traffic Rate": 1259.529984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.238967713
    },
    {
      "Date": "8/25/2019",
      "Time": "10:31:00 AM",
      "Inbound Traffic Rate": 3.21722,
      "Outbound Traffic Rate": 1295.330048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.248370676
    },
    {
      "Date": "8/25/2019",
      "Time": "10:36:00 AM",
      "Inbound Traffic Rate": 2.94002,
      "Outbound Traffic Rate": 1308.530048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.224681122
    },
    {
      "Date": "8/25/2019",
      "Time": "10:41:00 AM",
      "Inbound Traffic Rate": 2.79595,
      "Outbound Traffic Rate": 1288.300032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.217026308
    },
    {
      "Date": "8/25/2019",
      "Time": "10:46:00 AM",
      "Inbound Traffic Rate": 2.80599,
      "Outbound Traffic Rate": 1346.680064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.208363521
    },
    {
      "Date": "8/25/2019",
      "Time": "10:51:00 AM",
      "Inbound Traffic Rate": 3.06809,
      "Outbound Traffic Rate": 1336.489984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.229563262
    },
    {
      "Date": "8/25/2019",
      "Time": "10:56:00 AM",
      "Inbound Traffic Rate": 3.18099,
      "Outbound Traffic Rate": 1309.400064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.24293492
    },
    {
      "Date": "8/25/2019",
      "Time": "11:01:00 AM",
      "Inbound Traffic Rate": 3.41778,
      "Outbound Traffic Rate": 1257.28,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.271839208
    },
    {
      "Date": "8/25/2019",
      "Time": "11:06:00 AM",
      "Inbound Traffic Rate": 3.66003,
      "Outbound Traffic Rate": 1314.909952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.278348338
    },
    {
      "Date": "8/25/2019",
      "Time": "11:11:00 AM",
      "Inbound Traffic Rate": 2.94919,
      "Outbound Traffic Rate": 1339.830016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.220116729
    },
    {
      "Date": "8/25/2019",
      "Time": "11:16:00 AM",
      "Inbound Traffic Rate": 2.88327,
      "Outbound Traffic Rate": 1280.540032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.225160474
    },
    {
      "Date": "8/25/2019",
      "Time": "11:21:00 AM",
      "Inbound Traffic Rate": 2.94916,
      "Outbound Traffic Rate": 1289.750016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.228661366
    },
    {
      "Date": "8/25/2019",
      "Time": "11:26:00 AM",
      "Inbound Traffic Rate": 3.117,
      "Outbound Traffic Rate": 1261.159936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.247153427
    },
    {
      "Date": "8/25/2019",
      "Time": "11:31:00 AM",
      "Inbound Traffic Rate": 3.29395,
      "Outbound Traffic Rate": 1315.709952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.250355331
    },
    {
      "Date": "8/25/2019",
      "Time": "11:36:00 AM",
      "Inbound Traffic Rate": 3.54696,
      "Outbound Traffic Rate": 1341.030016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.264495198
    },
    {
      "Date": "8/25/2019",
      "Time": "11:41:00 AM",
      "Inbound Traffic Rate": 3.11111,
      "Outbound Traffic Rate": 1362.040064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.228415454
    },
    {
      "Date": "8/25/2019",
      "Time": "11:46:00 AM",
      "Inbound Traffic Rate": 3.74897,
      "Outbound Traffic Rate": 1336.16,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.280577925
    },
    {
      "Date": "8/25/2019",
      "Time": "11:51:00 AM",
      "Inbound Traffic Rate": 3.23157,
      "Outbound Traffic Rate": 1391.900032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.232169691
    },
    {
      "Date": "8/25/2019",
      "Time": "11:56:00 AM",
      "Inbound Traffic Rate": 3.17699,
      "Outbound Traffic Rate": 1375.779968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.230922827
    },
    {
      "Date": "8/25/2019",
      "Time": "12:01:00 PM",
      "Inbound Traffic Rate": 2.83601,
      "Outbound Traffic Rate": 1398.680064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.20276331
    },
    {
      "Date": "8/25/2019",
      "Time": "12:06:00 PM",
      "Inbound Traffic Rate": 2.88785,
      "Outbound Traffic Rate": 1365.420032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.211499021
    },
    {
      "Date": "8/25/2019",
      "Time": "12:11:00 PM",
      "Inbound Traffic Rate": 3.06094,
      "Outbound Traffic Rate": 1343.939968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.227758685
    },
    {
      "Date": "8/25/2019",
      "Time": "12:16:00 PM",
      "Inbound Traffic Rate": 2.97319,
      "Outbound Traffic Rate": 1397.779968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.212708013
    },
    {
      "Date": "8/25/2019",
      "Time": "12:21:00 PM",
      "Inbound Traffic Rate": 2.88576,
      "Outbound Traffic Rate": 1433.720064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.201277786
    },
    {
      "Date": "8/25/2019",
      "Time": "12:26:00 PM",
      "Inbound Traffic Rate": 3.19246,
      "Outbound Traffic Rate": 1351.030016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.236298229
    },
    {
      "Date": "8/25/2019",
      "Time": "12:31:00 PM",
      "Inbound Traffic Rate": 3.30741,
      "Outbound Traffic Rate": 1364.679936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.242357927
    },
    {
      "Date": "8/25/2019",
      "Time": "12:36:00 PM",
      "Inbound Traffic Rate": 3.37769,
      "Outbound Traffic Rate": 1381.219968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.24454396
    },
    {
      "Date": "8/25/2019",
      "Time": "12:41:00 PM",
      "Inbound Traffic Rate": 3.07221,
      "Outbound Traffic Rate": 1373.139968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.223736114
    },
    {
      "Date": "8/25/2019",
      "Time": "12:46:00 PM",
      "Inbound Traffic Rate": 3.22165,
      "Outbound Traffic Rate": 1353.799936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.237970908
    },
    {
      "Date": "8/25/2019",
      "Time": "12:51:00 PM",
      "Inbound Traffic Rate": 3.29058,
      "Outbound Traffic Rate": 1378.089984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.238778312
    },
    {
      "Date": "8/25/2019",
      "Time": "12:56:00 PM",
      "Inbound Traffic Rate": 3.39751,
      "Outbound Traffic Rate": 1409.670016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.241014561
    },
    {
      "Date": "8/25/2019",
      "Time": "1:01:00 PM",
      "Inbound Traffic Rate": 3.33008,
      "Outbound Traffic Rate": 1417.740032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.234886504
    },
    {
      "Date": "8/25/2019",
      "Time": "1:06:00 PM",
      "Inbound Traffic Rate": 3.51291,
      "Outbound Traffic Rate": 1426.140032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.246322936
    },
    {
      "Date": "8/25/2019",
      "Time": "1:11:00 PM",
      "Inbound Traffic Rate": 3.50755,
      "Outbound Traffic Rate": 1405.049984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.249638806
    },
    {
      "Date": "8/25/2019",
      "Time": "1:16:00 PM",
      "Inbound Traffic Rate": 3.12112,
      "Outbound Traffic Rate": 1438.809984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.21692371
    },
    {
      "Date": "8/25/2019",
      "Time": "1:21:00 PM",
      "Inbound Traffic Rate": 3.55212,
      "Outbound Traffic Rate": 1396.600064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.25434053
    },
    {
      "Date": "8/25/2019",
      "Time": "1:26:00 PM",
      "Inbound Traffic Rate": 3.48889,
      "Outbound Traffic Rate": 1439.260032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.242408593
    },
    {
      "Date": "8/25/2019",
      "Time": "1:31:00 PM",
      "Inbound Traffic Rate": 3.38372,
      "Outbound Traffic Rate": 1488.850048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.227270705
    },
    {
      "Date": "8/25/2019",
      "Time": "1:36:00 PM",
      "Inbound Traffic Rate": 3.54792,
      "Outbound Traffic Rate": 1476.899968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.240227509
    },
    {
      "Date": "8/25/2019",
      "Time": "1:41:00 PM",
      "Inbound Traffic Rate": 3.2948,
      "Outbound Traffic Rate": 1502.179968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.219334572
    },
    {
      "Date": "8/25/2019",
      "Time": "1:46:00 PM",
      "Inbound Traffic Rate": 3.47153,
      "Outbound Traffic Rate": 1490.8,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.232863563
    },
    {
      "Date": "8/25/2019",
      "Time": "1:51:00 PM",
      "Inbound Traffic Rate": 3.71919,
      "Outbound Traffic Rate": 1452.839936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.255994477
    },
    {
      "Date": "8/25/2019",
      "Time": "1:56:00 PM",
      "Inbound Traffic Rate": 3.33838,
      "Outbound Traffic Rate": 1420.329984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.235042563
    },
    {
      "Date": "8/25/2019",
      "Time": "2:01:00 PM",
      "Inbound Traffic Rate": 3.36121,
      "Outbound Traffic Rate": 1453.830016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.231196905
    },
    {
      "Date": "8/25/2019",
      "Time": "2:06:00 PM",
      "Inbound Traffic Rate": 3.9669,
      "Outbound Traffic Rate": 1439.970048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.275484897
    },
    {
      "Date": "8/25/2019",
      "Time": "2:11:00 PM",
      "Inbound Traffic Rate": 4.62189,
      "Outbound Traffic Rate": 1490.200064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.310152315
    },
    {
      "Date": "8/25/2019",
      "Time": "2:16:00 PM",
      "Inbound Traffic Rate": 3.52151,
      "Outbound Traffic Rate": 1470.72,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.239441226
    },
    {
      "Date": "8/25/2019",
      "Time": "2:21:00 PM",
      "Inbound Traffic Rate": 3.59233,
      "Outbound Traffic Rate": 1490.630016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.240994074
    },
    {
      "Date": "8/25/2019",
      "Time": "2:26:00 PM",
      "Inbound Traffic Rate": 3.68624,
      "Outbound Traffic Rate": 1533.52,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.240377693
    },
    {
      "Date": "8/25/2019",
      "Time": "2:31:00 PM",
      "Inbound Traffic Rate": 3.93819,
      "Outbound Traffic Rate": 1545.420032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.25482975
    },
    {
      "Date": "8/25/2019",
      "Time": "2:36:00 PM",
      "Inbound Traffic Rate": 5.1485,
      "Outbound Traffic Rate": 1525.430016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.337511387
    },
    {
      "Date": "8/25/2019",
      "Time": "2:41:00 PM",
      "Inbound Traffic Rate": 5.68117,
      "Outbound Traffic Rate": 1539.869952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.368938298
    },
    {
      "Date": "8/25/2019",
      "Time": "2:46:00 PM",
      "Inbound Traffic Rate": 5.45851,
      "Outbound Traffic Rate": 1529.830016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.356805001
    },
    {
      "Date": "8/25/2019",
      "Time": "2:51:00 PM",
      "Inbound Traffic Rate": 5.58849,
      "Outbound Traffic Rate": 1527.849984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.365774785
    },
    {
      "Date": "8/25/2019",
      "Time": "2:56:00 PM",
      "Inbound Traffic Rate": 5.77746,
      "Outbound Traffic Rate": 1544.739968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.374008579
    },
    {
      "Date": "8/25/2019",
      "Time": "3:01:00 PM",
      "Inbound Traffic Rate": 5.81799,
      "Outbound Traffic Rate": 1544.56,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.376676206
    },
    {
      "Date": "8/25/2019",
      "Time": "3:06:00 PM",
      "Inbound Traffic Rate": 6.24517,
      "Outbound Traffic Rate": 1593.44,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.391930038
    },
    {
      "Date": "8/25/2019",
      "Time": "3:11:00 PM",
      "Inbound Traffic Rate": 4.92871,
      "Outbound Traffic Rate": 1464.64,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.336513409
    },
    {
      "Date": "8/25/2019",
      "Time": "3:16:00 PM",
      "Inbound Traffic Rate": 5.03208,
      "Outbound Traffic Rate": 1455.929984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.345626511
    },
    {
      "Date": "8/25/2019",
      "Time": "3:21:00 PM",
      "Inbound Traffic Rate": 5.12967,
      "Outbound Traffic Rate": 1493.490048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.343468643
    },
    {
      "Date": "8/25/2019",
      "Time": "3:26:00 PM",
      "Inbound Traffic Rate": 4.8618,
      "Outbound Traffic Rate": 1563.44,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.310968122
    },
    {
      "Date": "8/25/2019",
      "Time": "3:31:00 PM",
      "Inbound Traffic Rate": 5.57022,
      "Outbound Traffic Rate": 1601.590016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.347793127
    },
    {
      "Date": "8/25/2019",
      "Time": "3:36:00 PM",
      "Inbound Traffic Rate": 5.67918,
      "Outbound Traffic Rate": 1580.060032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.359428116
    },
    {
      "Date": "8/25/2019",
      "Time": "3:41:00 PM",
      "Inbound Traffic Rate": 4.94736,
      "Outbound Traffic Rate": 1594.150016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.310344695
    },
    {
      "Date": "8/25/2019",
      "Time": "3:46:00 PM",
      "Inbound Traffic Rate": 5.07582,
      "Outbound Traffic Rate": 1619.640064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.313391852
    },
    {
      "Date": "8/25/2019",
      "Time": "3:51:00 PM",
      "Inbound Traffic Rate": 4.89134,
      "Outbound Traffic Rate": 1605.270016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.304705124
    },
    {
      "Date": "8/25/2019",
      "Time": "3:56:00 PM",
      "Inbound Traffic Rate": 5.01271,
      "Outbound Traffic Rate": 1572,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.318874682
    },
    {
      "Date": "8/25/2019",
      "Time": "4:01:00 PM",
      "Inbound Traffic Rate": 5.26933,
      "Outbound Traffic Rate": 1528.530048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.344731856
    },
    {
      "Date": "8/25/2019",
      "Time": "4:06:00 PM",
      "Inbound Traffic Rate": 5.04359,
      "Outbound Traffic Rate": 1513.299968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.33328422
    },
    {
      "Date": "8/25/2019",
      "Time": "4:11:00 PM",
      "Inbound Traffic Rate": 5.52296,
      "Outbound Traffic Rate": 1500.16,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.368158063
    },
    {
      "Date": "8/25/2019",
      "Time": "4:16:00 PM",
      "Inbound Traffic Rate": 5.66044,
      "Outbound Traffic Rate": 1445.129984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.391690717
    },
    {
      "Date": "8/25/2019",
      "Time": "4:21:00 PM",
      "Inbound Traffic Rate": 5.45903,
      "Outbound Traffic Rate": 1531.079936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.356547681
    },
    {
      "Date": "8/25/2019",
      "Time": "4:26:00 PM",
      "Inbound Traffic Rate": 5.71217,
      "Outbound Traffic Rate": 1593.990016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.358356699
    },
    {
      "Date": "8/25/2019",
      "Time": "4:31:00 PM",
      "Inbound Traffic Rate": 5.06291,
      "Outbound Traffic Rate": 1529.740032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.330965386
    },
    {
      "Date": "8/25/2019",
      "Time": "4:36:00 PM",
      "Inbound Traffic Rate": 5.52851,
      "Outbound Traffic Rate": 1533.309952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.360560498
    },
    {
      "Date": "8/25/2019",
      "Time": "4:41:00 PM",
      "Inbound Traffic Rate": 4.21384,
      "Outbound Traffic Rate": 1528.269952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.275726157
    },
    {
      "Date": "8/25/2019",
      "Time": "4:46:00 PM",
      "Inbound Traffic Rate": 4.4804,
      "Outbound Traffic Rate": 1590,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.281786164
    },
    {
      "Date": "8/25/2019",
      "Time": "4:51:00 PM",
      "Inbound Traffic Rate": 4.14584,
      "Outbound Traffic Rate": 1509.92,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.274573487
    },
    {
      "Date": "8/25/2019",
      "Time": "4:56:00 PM",
      "Inbound Traffic Rate": 4.27946,
      "Outbound Traffic Rate": 1465.219968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.292069457
    },
    {
      "Date": "8/25/2019",
      "Time": "5:01:00 PM",
      "Inbound Traffic Rate": 4.55108,
      "Outbound Traffic Rate": 1500.380032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.303328484
    },
    {
      "Date": "8/25/2019",
      "Time": "5:06:00 PM",
      "Inbound Traffic Rate": 4.70165,
      "Outbound Traffic Rate": 1509.660032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.311437668
    },
    {
      "Date": "8/25/2019",
      "Time": "5:11:00 PM",
      "Inbound Traffic Rate": 4.2427,
      "Outbound Traffic Rate": 1458.509952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.29089277
    },
    {
      "Date": "8/25/2019",
      "Time": "5:16:00 PM",
      "Inbound Traffic Rate": 3.98922,
      "Outbound Traffic Rate": 1483.270016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.26894766
    },
    {
      "Date": "8/25/2019",
      "Time": "5:21:00 PM",
      "Inbound Traffic Rate": 4.0957,
      "Outbound Traffic Rate": 1553.350016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.263668842
    },
    {
      "Date": "8/25/2019",
      "Time": "5:26:00 PM",
      "Inbound Traffic Rate": 3.90026,
      "Outbound Traffic Rate": 1505.250048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.259110439
    },
    {
      "Date": "8/25/2019",
      "Time": "5:31:00 PM",
      "Inbound Traffic Rate": 3.99221,
      "Outbound Traffic Rate": 1468.839936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.2717934
    },
    {
      "Date": "8/25/2019",
      "Time": "5:36:00 PM",
      "Inbound Traffic Rate": 3.97218,
      "Outbound Traffic Rate": 1411.430016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.281429469
    },
    {
      "Date": "8/25/2019",
      "Time": "5:41:00 PM",
      "Inbound Traffic Rate": 3.74774,
      "Outbound Traffic Rate": 1472.489984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.254517181
    },
    {
      "Date": "8/25/2019",
      "Time": "5:46:00 PM",
      "Inbound Traffic Rate": 4.43828,
      "Outbound Traffic Rate": 1512.050048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.293527321
    },
    {
      "Date": "8/25/2019",
      "Time": "5:51:00 PM",
      "Inbound Traffic Rate": 4.26328,
      "Outbound Traffic Rate": 1489.44,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.286233752
    },
    {
      "Date": "8/25/2019",
      "Time": "5:56:00 PM",
      "Inbound Traffic Rate": 4.07736,
      "Outbound Traffic Rate": 1542.819968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.264279701
    },
    {
      "Date": "8/25/2019",
      "Time": "6:01:00 PM",
      "Inbound Traffic Rate": 4.40579,
      "Outbound Traffic Rate": 1514.419968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.290922604
    },
    {
      "Date": "8/25/2019",
      "Time": "6:06:00 PM",
      "Inbound Traffic Rate": 4.88227,
      "Outbound Traffic Rate": 1477.389952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.3304659
    },
    {
      "Date": "8/25/2019",
      "Time": "6:11:00 PM",
      "Inbound Traffic Rate": 4.10654,
      "Outbound Traffic Rate": 1476.88,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.278055089
    },
    {
      "Date": "8/25/2019",
      "Time": "6:16:00 PM",
      "Inbound Traffic Rate": 4.69926,
      "Outbound Traffic Rate": 1465.430016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.320674474
    },
    {
      "Date": "8/25/2019",
      "Time": "6:21:00 PM",
      "Inbound Traffic Rate": 4.47942,
      "Outbound Traffic Rate": 1492.089984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.300211116
    },
    {
      "Date": "8/25/2019",
      "Time": "6:26:00 PM",
      "Inbound Traffic Rate": 4.30631,
      "Outbound Traffic Rate": 1500.070016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.287073933
    },
    {
      "Date": "8/25/2019",
      "Time": "6:31:00 PM",
      "Inbound Traffic Rate": 4.34431,
      "Outbound Traffic Rate": 1479.020032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.293728949
    },
    {
      "Date": "8/25/2019",
      "Time": "6:36:00 PM",
      "Inbound Traffic Rate": 4.16058,
      "Outbound Traffic Rate": 1407.580032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.295583903
    },
    {
      "Date": "8/25/2019",
      "Time": "6:41:00 PM",
      "Inbound Traffic Rate": 4.67576,
      "Outbound Traffic Rate": 1407.100032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.332297626
    },
    {
      "Date": "8/25/2019",
      "Time": "6:46:00 PM",
      "Inbound Traffic Rate": 4.27631,
      "Outbound Traffic Rate": 1417.069952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.301771271
    },
    {
      "Date": "8/25/2019",
      "Time": "6:51:00 PM",
      "Inbound Traffic Rate": 4.4434,
      "Outbound Traffic Rate": 1415.180032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.313981253
    },
    {
      "Date": "8/25/2019",
      "Time": "6:56:00 PM",
      "Inbound Traffic Rate": 4.49128,
      "Outbound Traffic Rate": 1406.530048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.319316321
    },
    {
      "Date": "8/25/2019",
      "Time": "7:01:00 PM",
      "Inbound Traffic Rate": 4.11703,
      "Outbound Traffic Rate": 1405.139968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.292997857
    },
    {
      "Date": "8/25/2019",
      "Time": "7:06:00 PM",
      "Inbound Traffic Rate": 4.21957,
      "Outbound Traffic Rate": 1386.889984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.304246916
    },
    {
      "Date": "8/25/2019",
      "Time": "7:11:00 PM",
      "Inbound Traffic Rate": 4.27583,
      "Outbound Traffic Rate": 1448.620032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.295165737
    },
    {
      "Date": "8/25/2019",
      "Time": "7:16:00 PM",
      "Inbound Traffic Rate": 4.06548,
      "Outbound Traffic Rate": 1501.740032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.270717961
    },
    {
      "Date": "8/25/2019",
      "Time": "7:21:00 PM",
      "Inbound Traffic Rate": 3.73595,
      "Outbound Traffic Rate": 1499.939968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.249073302
    },
    {
      "Date": "8/25/2019",
      "Time": "7:26:00 PM",
      "Inbound Traffic Rate": 3.86152,
      "Outbound Traffic Rate": 1560.610048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.247436572
    },
    {
      "Date": "8/25/2019",
      "Time": "7:31:00 PM",
      "Inbound Traffic Rate": 3.75524,
      "Outbound Traffic Rate": 1582.780032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.237255963
    },
    {
      "Date": "8/25/2019",
      "Time": "7:36:00 PM",
      "Inbound Traffic Rate": 3.70975,
      "Outbound Traffic Rate": 1565.330048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.236994748
    },
    {
      "Date": "8/25/2019",
      "Time": "7:41:00 PM",
      "Inbound Traffic Rate": 3.78236,
      "Outbound Traffic Rate": 1575.129984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.240130023
    },
    {
      "Date": "8/25/2019",
      "Time": "7:46:00 PM",
      "Inbound Traffic Rate": 3.94823,
      "Outbound Traffic Rate": 1600.920064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.246622557
    },
    {
      "Date": "8/25/2019",
      "Time": "7:51:00 PM",
      "Inbound Traffic Rate": 4.08833,
      "Outbound Traffic Rate": 1572.669952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.259961093
    },
    {
      "Date": "8/25/2019",
      "Time": "7:56:00 PM",
      "Inbound Traffic Rate": 3.6694,
      "Outbound Traffic Rate": 1522.809984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.240962434
    },
    {
      "Date": "8/25/2019",
      "Time": "8:01:00 PM",
      "Inbound Traffic Rate": 3.80764,
      "Outbound Traffic Rate": 1578.749952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.241180688
    },
    {
      "Date": "8/25/2019",
      "Time": "8:06:00 PM",
      "Inbound Traffic Rate": 4.12491,
      "Outbound Traffic Rate": 1569.049984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.262892199
    },
    {
      "Date": "8/25/2019",
      "Time": "8:11:00 PM",
      "Inbound Traffic Rate": 3.73618,
      "Outbound Traffic Rate": 1607.469952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.232426118
    },
    {
      "Date": "8/25/2019",
      "Time": "8:16:00 PM",
      "Inbound Traffic Rate": 3.62533,
      "Outbound Traffic Rate": 1597.479936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.226940565
    },
    {
      "Date": "8/25/2019",
      "Time": "8:21:00 PM",
      "Inbound Traffic Rate": 3.90702,
      "Outbound Traffic Rate": 1556.470016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.251018006
    },
    {
      "Date": "8/25/2019",
      "Time": "8:26:00 PM",
      "Inbound Traffic Rate": 4.65411,
      "Outbound Traffic Rate": 1557.980032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.298727192
    },
    {
      "Date": "8/25/2019",
      "Time": "8:31:00 PM",
      "Inbound Traffic Rate": 4.28767,
      "Outbound Traffic Rate": 1596.96,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.268489505
    },
    {
      "Date": "8/25/2019",
      "Time": "8:36:00 PM",
      "Inbound Traffic Rate": 4.22759,
      "Outbound Traffic Rate": 1601.170048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.264031294
    },
    {
      "Date": "8/25/2019",
      "Time": "8:41:00 PM",
      "Inbound Traffic Rate": 3.94807,
      "Outbound Traffic Rate": 1622.179968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.243380517
    },
    {
      "Date": "8/25/2019",
      "Time": "8:46:00 PM",
      "Inbound Traffic Rate": 4.41015,
      "Outbound Traffic Rate": 1606.700032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.274484964
    },
    {
      "Date": "8/25/2019",
      "Time": "8:51:00 PM",
      "Inbound Traffic Rate": 4.2243,
      "Outbound Traffic Rate": 1635.68,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.258259562
    },
    {
      "Date": "8/25/2019",
      "Time": "8:56:00 PM",
      "Inbound Traffic Rate": 4.55834,
      "Outbound Traffic Rate": 1627.449984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.280090943
    },
    {
      "Date": "8/25/2019",
      "Time": "9:01:00 PM",
      "Inbound Traffic Rate": 4.30573,
      "Outbound Traffic Rate": 1582.989952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.271999831
    },
    {
      "Date": "8/25/2019",
      "Time": "9:06:00 PM",
      "Inbound Traffic Rate": 4.02504,
      "Outbound Traffic Rate": 1631.160064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.246759352
    },
    {
      "Date": "8/25/2019",
      "Time": "9:11:00 PM",
      "Inbound Traffic Rate": 3.54798,
      "Outbound Traffic Rate": 1658.4,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.213939942
    },
    {
      "Date": "8/25/2019",
      "Time": "9:16:00 PM",
      "Inbound Traffic Rate": 3.43086,
      "Outbound Traffic Rate": 1699.129984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.201918631
    },
    {
      "Date": "8/25/2019",
      "Time": "9:21:00 PM",
      "Inbound Traffic Rate": 3.89643,
      "Outbound Traffic Rate": 1641.139968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.237422162
    },
    {
      "Date": "8/25/2019",
      "Time": "9:26:00 PM",
      "Inbound Traffic Rate": 3.53543,
      "Outbound Traffic Rate": 1610.989952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.219456986
    },
    {
      "Date": "8/25/2019",
      "Time": "9:31:00 PM",
      "Inbound Traffic Rate": 3.65491,
      "Outbound Traffic Rate": 1616.48,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.226103014
    },
    {
      "Date": "8/25/2019",
      "Time": "9:36:00 PM",
      "Inbound Traffic Rate": 3.57681,
      "Outbound Traffic Rate": 1630.96,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.219307034
    },
    {
      "Date": "8/25/2019",
      "Time": "9:41:00 PM",
      "Inbound Traffic Rate": 3.82556,
      "Outbound Traffic Rate": 1571.010048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.243509582
    },
    {
      "Date": "8/25/2019",
      "Time": "9:46:00 PM",
      "Inbound Traffic Rate": 4.23776,
      "Outbound Traffic Rate": 1541.799936,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.27485797
    },
    {
      "Date": "8/25/2019",
      "Time": "9:51:00 PM",
      "Inbound Traffic Rate": 3.90617,
      "Outbound Traffic Rate": 1585.389952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.246385439
    },
    {
      "Date": "8/25/2019",
      "Time": "9:56:00 PM",
      "Inbound Traffic Rate": 3.66036,
      "Outbound Traffic Rate": 1622.099968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.225655636
    },
    {
      "Date": "8/25/2019",
      "Time": "10:01:00 PM",
      "Inbound Traffic Rate": 3.68593,
      "Outbound Traffic Rate": 1581.580032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.23305365
    },
    {
      "Date": "8/25/2019",
      "Time": "10:06:00 PM",
      "Inbound Traffic Rate": 3.8602,
      "Outbound Traffic Rate": 1643.859968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.234825355
    },
    {
      "Date": "8/25/2019",
      "Time": "10:11:00 PM",
      "Inbound Traffic Rate": 4.69214,
      "Outbound Traffic Rate": 1668.780032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.281171869
    },
    {
      "Date": "8/25/2019",
      "Time": "10:16:00 PM",
      "Inbound Traffic Rate": 4.43641,
      "Outbound Traffic Rate": 1656.64,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.267795659
    },
    {
      "Date": "8/25/2019",
      "Time": "10:21:00 PM",
      "Inbound Traffic Rate": 3.33953,
      "Outbound Traffic Rate": 1627.890048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.20514469
    },
    {
      "Date": "8/25/2019",
      "Time": "10:26:00 PM",
      "Inbound Traffic Rate": 3.59497,
      "Outbound Traffic Rate": 1703.68,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.211012045
    },
    {
      "Date": "8/25/2019",
      "Time": "10:31:00 PM",
      "Inbound Traffic Rate": 3.99137,
      "Outbound Traffic Rate": 1681.730048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.23733714
    },
    {
      "Date": "8/25/2019",
      "Time": "10:36:00 PM",
      "Inbound Traffic Rate": 3.5542,
      "Outbound Traffic Rate": 1641.420032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.216532023
    },
    {
      "Date": "8/25/2019",
      "Time": "10:41:00 PM",
      "Inbound Traffic Rate": 3.57953,
      "Outbound Traffic Rate": 1612.300032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.222013889
    },
    {
      "Date": "8/25/2019",
      "Time": "10:46:00 PM",
      "Inbound Traffic Rate": 3.10013,
      "Outbound Traffic Rate": 1682.909952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.184212471
    },
    {
      "Date": "8/25/2019",
      "Time": "10:51:00 PM",
      "Inbound Traffic Rate": 3.25874,
      "Outbound Traffic Rate": 1674.409984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.194620196
    },
    {
      "Date": "8/25/2019",
      "Time": "10:56:00 PM",
      "Inbound Traffic Rate": 3.11592,
      "Outbound Traffic Rate": 1676.150016,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.185897442
    },
    {
      "Date": "8/25/2019",
      "Time": "11:01:00 PM",
      "Inbound Traffic Rate": 4.172,
      "Outbound Traffic Rate": 1597.010048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.261238181
    },
    {
      "Date": "8/25/2019",
      "Time": "11:06:00 PM",
      "Inbound Traffic Rate": 3.32931,
      "Outbound Traffic Rate": 1629.660032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.204294757
    },
    {
      "Date": "8/25/2019",
      "Time": "11:11:00 PM",
      "Inbound Traffic Rate": 3.47131,
      "Outbound Traffic Rate": 1574.210048,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.220511234
    },
    {
      "Date": "8/25/2019",
      "Time": "11:16:00 PM",
      "Inbound Traffic Rate": 3.46483,
      "Outbound Traffic Rate": 1582.909952,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.218889899
    },
    {
      "Date": "8/25/2019",
      "Time": "11:21:00 PM",
      "Inbound Traffic Rate": 3.45664,
      "Outbound Traffic Rate": 1498.520064,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.230670251
    },
    {
      "Date": "8/25/2019",
      "Time": "11:26:00 PM",
      "Inbound Traffic Rate": 3.33395,
      "Outbound Traffic Rate": 1513.900032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.220222599
    },
    {
      "Date": "8/25/2019",
      "Time": "11:31:00 PM",
      "Inbound Traffic Rate": 3.39715,
      "Outbound Traffic Rate": 1471.6,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.230847377
    },
    {
      "Date": "8/25/2019",
      "Time": "11:36:00 PM",
      "Inbound Traffic Rate": 3.4452,
      "Outbound Traffic Rate": 1465.849984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.235030872
    },
    {
      "Date": "8/25/2019",
      "Time": "11:41:00 PM",
      "Inbound Traffic Rate": 3.0027,
      "Outbound Traffic Rate": 1439.449984,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.208600509
    },
    {
      "Date": "8/25/2019",
      "Time": "11:46:00 PM",
      "Inbound Traffic Rate": 3.44579,
      "Outbound Traffic Rate": 1452.300032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.237264334
    },
    {
      "Date": "8/25/2019",
      "Time": "11:51:00 PM",
      "Inbound Traffic Rate": 3.44551,
      "Outbound Traffic Rate": 1420.860032,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.242494681
    },
    {
      "Date": "8/25/2019",
      "Time": "11:56:00 PM",
      "Inbound Traffic Rate": 3.65411,
      "Outbound Traffic Rate": 1459.699968,
      "Day of Week": "Sunday",
      "Traffic Ratio": 0.250332951
    },
    {
      "Date": "8/26/2019",
      "Time": "12:01:00 AM",
      "Inbound Traffic Rate": 3.1896,
      "Outbound Traffic Rate": 1434.710016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.222316703
    },
    {
      "Date": "8/26/2019",
      "Time": "12:06:00 AM",
      "Inbound Traffic Rate": 3.2956,
      "Outbound Traffic Rate": 1408.109952,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.234044223
    },
    {
      "Date": "8/26/2019",
      "Time": "12:11:00 AM",
      "Inbound Traffic Rate": 2.84825,
      "Outbound Traffic Rate": 1370.819968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.207777102
    },
    {
      "Date": "8/26/2019",
      "Time": "12:16:00 AM",
      "Inbound Traffic Rate": 2.61297,
      "Outbound Traffic Rate": 1330.360064,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.196410737
    },
    {
      "Date": "8/26/2019",
      "Time": "12:21:00 AM",
      "Inbound Traffic Rate": 2.83745,
      "Outbound Traffic Rate": 1264.060032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.224471143
    },
    {
      "Date": "8/26/2019",
      "Time": "12:26:00 AM",
      "Inbound Traffic Rate": 2.98851,
      "Outbound Traffic Rate": 1330.119936,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.224679739
    },
    {
      "Date": "8/26/2019",
      "Time": "12:31:00 AM",
      "Inbound Traffic Rate": 2.48334,
      "Outbound Traffic Rate": 1302.200064,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.190703416
    },
    {
      "Date": "8/26/2019",
      "Time": "12:36:00 AM",
      "Inbound Traffic Rate": 2.72279,
      "Outbound Traffic Rate": 1283.139968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.212197427
    },
    {
      "Date": "8/26/2019",
      "Time": "12:41:00 AM",
      "Inbound Traffic Rate": 2.67627,
      "Outbound Traffic Rate": 1308.359936,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.20455151
    },
    {
      "Date": "8/26/2019",
      "Time": "12:46:00 AM",
      "Inbound Traffic Rate": 2.39608,
      "Outbound Traffic Rate": 1306.819968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.183351958
    },
    {
      "Date": "8/26/2019",
      "Time": "12:51:00 AM",
      "Inbound Traffic Rate": 2.64402,
      "Outbound Traffic Rate": 1222.259968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.216322228
    },
    {
      "Date": "8/26/2019",
      "Time": "12:56:00 AM",
      "Inbound Traffic Rate": 2.90209,
      "Outbound Traffic Rate": 1254.840064,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.231271704
    },
    {
      "Date": "8/26/2019",
      "Time": "1:01:00 AM",
      "Inbound Traffic Rate": 3.03975,
      "Outbound Traffic Rate": 1212.470016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.250707231
    },
    {
      "Date": "8/26/2019",
      "Time": "1:06:00 AM",
      "Inbound Traffic Rate": 2.97873,
      "Outbound Traffic Rate": 1278,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.233077465
    },
    {
      "Date": "8/26/2019",
      "Time": "1:11:00 AM",
      "Inbound Traffic Rate": 3.83616,
      "Outbound Traffic Rate": 1316.579968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.29137311
    },
    {
      "Date": "8/26/2019",
      "Time": "1:16:00 AM",
      "Inbound Traffic Rate": 3.81284,
      "Outbound Traffic Rate": 1340.690048,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.284393847
    },
    {
      "Date": "8/26/2019",
      "Time": "1:21:00 AM",
      "Inbound Traffic Rate": 3.73251,
      "Outbound Traffic Rate": 1319.129984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.282952404
    },
    {
      "Date": "8/26/2019",
      "Time": "1:26:00 AM",
      "Inbound Traffic Rate": 3.39653,
      "Outbound Traffic Rate": 1295.420032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.262195266
    },
    {
      "Date": "8/26/2019",
      "Time": "1:31:00 AM",
      "Inbound Traffic Rate": 2.9561,
      "Outbound Traffic Rate": 1276.300032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.231614818
    },
    {
      "Date": "8/26/2019",
      "Time": "1:36:00 AM",
      "Inbound Traffic Rate": 3.31133,
      "Outbound Traffic Rate": 1224.839936,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.270347978
    },
    {
      "Date": "8/26/2019",
      "Time": "1:41:00 AM",
      "Inbound Traffic Rate": 3.44598,
      "Outbound Traffic Rate": 1198.509952,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.287522018
    },
    {
      "Date": "8/26/2019",
      "Time": "1:46:00 AM",
      "Inbound Traffic Rate": 3.52654,
      "Outbound Traffic Rate": 1187.180032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.297051829
    },
    {
      "Date": "8/26/2019",
      "Time": "1:51:00 AM",
      "Inbound Traffic Rate": 3.67248,
      "Outbound Traffic Rate": 1158.680064,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.316953757
    },
    {
      "Date": "8/26/2019",
      "Time": "1:56:00 AM",
      "Inbound Traffic Rate": 3.51365,
      "Outbound Traffic Rate": 1172.220032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.299743214
    },
    {
      "Date": "8/26/2019",
      "Time": "2:01:00 AM",
      "Inbound Traffic Rate": 3.91229,
      "Outbound Traffic Rate": 1163.900032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.336136257
    },
    {
      "Date": "8/26/2019",
      "Time": "2:06:00 AM",
      "Inbound Traffic Rate": 3.46905,
      "Outbound Traffic Rate": 1111.929984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.311984572
    },
    {
      "Date": "8/26/2019",
      "Time": "2:11:00 AM",
      "Inbound Traffic Rate": 3.06793,
      "Outbound Traffic Rate": 1121.76,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.273492547
    },
    {
      "Date": "8/26/2019",
      "Time": "2:16:00 AM",
      "Inbound Traffic Rate": 3.70734,
      "Outbound Traffic Rate": 1050.16,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.353026206
    },
    {
      "Date": "8/26/2019",
      "Time": "2:21:00 AM",
      "Inbound Traffic Rate": 3.64912,
      "Outbound Traffic Rate": 995.612032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.366520279
    },
    {
      "Date": "8/26/2019",
      "Time": "2:26:00 AM",
      "Inbound Traffic Rate": 3.73125,
      "Outbound Traffic Rate": 994.078016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.375347804
    },
    {
      "Date": "8/26/2019",
      "Time": "2:31:00 AM",
      "Inbound Traffic Rate": 4.0075,
      "Outbound Traffic Rate": 1019.870016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.392942232
    },
    {
      "Date": "8/26/2019",
      "Time": "2:36:00 AM",
      "Inbound Traffic Rate": 4.10136,
      "Outbound Traffic Rate": 1007.030016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.407272865
    },
    {
      "Date": "8/26/2019",
      "Time": "2:41:00 AM",
      "Inbound Traffic Rate": 3.80821,
      "Outbound Traffic Rate": 935.868992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.406916997
    },
    {
      "Date": "8/26/2019",
      "Time": "2:46:00 AM",
      "Inbound Traffic Rate": 3.69224,
      "Outbound Traffic Rate": 881.302976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.418952403
    },
    {
      "Date": "8/26/2019",
      "Time": "2:51:00 AM",
      "Inbound Traffic Rate": 4.1285,
      "Outbound Traffic Rate": 860.678016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.479679964
    },
    {
      "Date": "8/26/2019",
      "Time": "2:56:00 AM",
      "Inbound Traffic Rate": 3.76743,
      "Outbound Traffic Rate": 819.518016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.459712895
    },
    {
      "Date": "8/26/2019",
      "Time": "3:01:00 AM",
      "Inbound Traffic Rate": 3.03003,
      "Outbound Traffic Rate": 794.921984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.381173255
    },
    {
      "Date": "8/26/2019",
      "Time": "3:06:00 AM",
      "Inbound Traffic Rate": 3.16564,
      "Outbound Traffic Rate": 793.110016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.399142608
    },
    {
      "Date": "8/26/2019",
      "Time": "3:11:00 AM",
      "Inbound Traffic Rate": 3.0032,
      "Outbound Traffic Rate": 816.233024,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.367934145
    },
    {
      "Date": "8/26/2019",
      "Time": "3:16:00 AM",
      "Inbound Traffic Rate": 2.59376,
      "Outbound Traffic Rate": 831.371008,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.311985861
    },
    {
      "Date": "8/26/2019",
      "Time": "3:21:00 AM",
      "Inbound Traffic Rate": 2.69372,
      "Outbound Traffic Rate": 812.227968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.331645807
    },
    {
      "Date": "8/26/2019",
      "Time": "3:26:00 AM",
      "Inbound Traffic Rate": 3.19822,
      "Outbound Traffic Rate": 804.334976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.397622893
    },
    {
      "Date": "8/26/2019",
      "Time": "3:31:00 AM",
      "Inbound Traffic Rate": 2.87601,
      "Outbound Traffic Rate": 762.969984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.376949298
    },
    {
      "Date": "8/26/2019",
      "Time": "3:36:00 AM",
      "Inbound Traffic Rate": 2.90842,
      "Outbound Traffic Rate": 727.475008,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.399796552
    },
    {
      "Date": "8/26/2019",
      "Time": "3:41:00 AM",
      "Inbound Traffic Rate": 3.27143,
      "Outbound Traffic Rate": 694.291008,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.471190029
    },
    {
      "Date": "8/26/2019",
      "Time": "3:46:00 AM",
      "Inbound Traffic Rate": 2.78985,
      "Outbound Traffic Rate": 741.313984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.37633851
    },
    {
      "Date": "8/26/2019",
      "Time": "3:51:00 AM",
      "Inbound Traffic Rate": 3.40404,
      "Outbound Traffic Rate": 733.750976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.463923063
    },
    {
      "Date": "8/26/2019",
      "Time": "3:56:00 AM",
      "Inbound Traffic Rate": 3.48067,
      "Outbound Traffic Rate": 718.558016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.484396517
    },
    {
      "Date": "8/26/2019",
      "Time": "4:01:00 AM",
      "Inbound Traffic Rate": 2.90516,
      "Outbound Traffic Rate": 743.102976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.390949854
    },
    {
      "Date": "8/26/2019",
      "Time": "4:06:00 AM",
      "Inbound Traffic Rate": 3.32313,
      "Outbound Traffic Rate": 738.312,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.450098332
    },
    {
      "Date": "8/26/2019",
      "Time": "4:11:00 AM",
      "Inbound Traffic Rate": 3.19286,
      "Outbound Traffic Rate": 704.467968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.453229976
    },
    {
      "Date": "8/26/2019",
      "Time": "4:16:00 AM",
      "Inbound Traffic Rate": 2.89248,
      "Outbound Traffic Rate": 720.070016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.401694271
    },
    {
      "Date": "8/26/2019",
      "Time": "4:21:00 AM",
      "Inbound Traffic Rate": 2.8734,
      "Outbound Traffic Rate": 752.544,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.38182485
    },
    {
      "Date": "8/26/2019",
      "Time": "4:26:00 AM",
      "Inbound Traffic Rate": 2.84581,
      "Outbound Traffic Rate": 680.014976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.418492254
    },
    {
      "Date": "8/26/2019",
      "Time": "4:31:00 AM",
      "Inbound Traffic Rate": 3.14064,
      "Outbound Traffic Rate": 636.132992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.493708083
    },
    {
      "Date": "8/26/2019",
      "Time": "4:36:00 AM",
      "Inbound Traffic Rate": 2.68954,
      "Outbound Traffic Rate": 605.665024,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.444063945
    },
    {
      "Date": "8/26/2019",
      "Time": "4:41:00 AM",
      "Inbound Traffic Rate": 2.63759,
      "Outbound Traffic Rate": 672.740992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.392066194
    },
    {
      "Date": "8/26/2019",
      "Time": "4:46:00 AM",
      "Inbound Traffic Rate": 3.1447,
      "Outbound Traffic Rate": 709.419008,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.443278227
    },
    {
      "Date": "8/26/2019",
      "Time": "4:51:00 AM",
      "Inbound Traffic Rate": 2.76857,
      "Outbound Traffic Rate": 720.544,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.384233302
    },
    {
      "Date": "8/26/2019",
      "Time": "4:56:00 AM",
      "Inbound Traffic Rate": 3.11445,
      "Outbound Traffic Rate": 634.915008,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.490530222
    },
    {
      "Date": "8/26/2019",
      "Time": "5:01:00 AM",
      "Inbound Traffic Rate": 2.79303,
      "Outbound Traffic Rate": 657.734976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.424643679
    },
    {
      "Date": "8/26/2019",
      "Time": "5:06:00 AM",
      "Inbound Traffic Rate": 2.60655,
      "Outbound Traffic Rate": 692.276992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.376518363
    },
    {
      "Date": "8/26/2019",
      "Time": "5:11:00 AM",
      "Inbound Traffic Rate": 2.65091,
      "Outbound Traffic Rate": 640.558016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.413843857
    },
    {
      "Date": "8/26/2019",
      "Time": "5:16:00 AM",
      "Inbound Traffic Rate": 2.78596,
      "Outbound Traffic Rate": 742.307008,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.37531102
    },
    {
      "Date": "8/26/2019",
      "Time": "5:21:00 AM",
      "Inbound Traffic Rate": 2.47665,
      "Outbound Traffic Rate": 726.628992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.340841066
    },
    {
      "Date": "8/26/2019",
      "Time": "5:26:00 AM",
      "Inbound Traffic Rate": 2.54397,
      "Outbound Traffic Rate": 675.929984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.376365905
    },
    {
      "Date": "8/26/2019",
      "Time": "5:31:00 AM",
      "Inbound Traffic Rate": 2.37443,
      "Outbound Traffic Rate": 702.878976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.337814913
    },
    {
      "Date": "8/26/2019",
      "Time": "5:36:00 AM",
      "Inbound Traffic Rate": 3.0238,
      "Outbound Traffic Rate": 756.153024,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.399892602
    },
    {
      "Date": "8/26/2019",
      "Time": "5:41:00 AM",
      "Inbound Traffic Rate": 2.89693,
      "Outbound Traffic Rate": 763.667968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.379344181
    },
    {
      "Date": "8/26/2019",
      "Time": "5:46:00 AM",
      "Inbound Traffic Rate": 3.09057,
      "Outbound Traffic Rate": 774.054016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.399270585
    },
    {
      "Date": "8/26/2019",
      "Time": "5:51:00 AM",
      "Inbound Traffic Rate": 2.85841,
      "Outbound Traffic Rate": 812.078976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.351986701
    },
    {
      "Date": "8/26/2019",
      "Time": "5:56:00 AM",
      "Inbound Traffic Rate": 3.14927,
      "Outbound Traffic Rate": 831.465024,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.378761573
    },
    {
      "Date": "8/26/2019",
      "Time": "6:01:00 AM",
      "Inbound Traffic Rate": 3.09103,
      "Outbound Traffic Rate": 865.004992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.357342446
    },
    {
      "Date": "8/26/2019",
      "Time": "6:06:00 AM",
      "Inbound Traffic Rate": 3.0531,
      "Outbound Traffic Rate": 847.113024,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.360412355
    },
    {
      "Date": "8/26/2019",
      "Time": "6:11:00 AM",
      "Inbound Traffic Rate": 2.52904,
      "Outbound Traffic Rate": 878.204992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.287978322
    },
    {
      "Date": "8/26/2019",
      "Time": "6:16:00 AM",
      "Inbound Traffic Rate": 2.79304,
      "Outbound Traffic Rate": 889.08,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.314149458
    },
    {
      "Date": "8/26/2019",
      "Time": "6:21:00 AM",
      "Inbound Traffic Rate": 3.27856,
      "Outbound Traffic Rate": 871.878976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.376033841
    },
    {
      "Date": "8/26/2019",
      "Time": "6:26:00 AM",
      "Inbound Traffic Rate": 3.2575,
      "Outbound Traffic Rate": 889.286976,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.366304701
    },
    {
      "Date": "8/26/2019",
      "Time": "6:31:00 AM",
      "Inbound Traffic Rate": 3.21202,
      "Outbound Traffic Rate": 857.753984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.374468677
    },
    {
      "Date": "8/26/2019",
      "Time": "6:36:00 AM",
      "Inbound Traffic Rate": 3.37463,
      "Outbound Traffic Rate": 883.380992,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.382012974
    },
    {
      "Date": "8/26/2019",
      "Time": "6:41:00 AM",
      "Inbound Traffic Rate": 3.07111,
      "Outbound Traffic Rate": 893.859968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.343578425
    },
    {
      "Date": "8/26/2019",
      "Time": "6:46:00 AM",
      "Inbound Traffic Rate": 3.01872,
      "Outbound Traffic Rate": 887.107968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.340287779
    },
    {
      "Date": "8/26/2019",
      "Time": "6:51:00 AM",
      "Inbound Traffic Rate": 2.69099,
      "Outbound Traffic Rate": 886.945984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.303399536
    },
    {
      "Date": "8/26/2019",
      "Time": "6:56:00 AM",
      "Inbound Traffic Rate": 3.08249,
      "Outbound Traffic Rate": 832.361024,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.370330891
    },
    {
      "Date": "8/26/2019",
      "Time": "7:01:00 AM",
      "Inbound Traffic Rate": 2.63796,
      "Outbound Traffic Rate": 862.998016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.305673936
    },
    {
      "Date": "8/26/2019",
      "Time": "7:06:00 AM",
      "Inbound Traffic Rate": 2.94428,
      "Outbound Traffic Rate": 847.121024,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.347563089
    },
    {
      "Date": "8/26/2019",
      "Time": "7:11:00 AM",
      "Inbound Traffic Rate": 2.85453,
      "Outbound Traffic Rate": 866.883968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.329286283
    },
    {
      "Date": "8/26/2019",
      "Time": "7:16:00 AM",
      "Inbound Traffic Rate": 2.81724,
      "Outbound Traffic Rate": 904.091008,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.311610222
    },
    {
      "Date": "8/26/2019",
      "Time": "7:21:00 AM",
      "Inbound Traffic Rate": 3.0854,
      "Outbound Traffic Rate": 875.518016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.352408511
    },
    {
      "Date": "8/26/2019",
      "Time": "7:26:00 AM",
      "Inbound Traffic Rate": 2.48296,
      "Outbound Traffic Rate": 950.126016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.261329546
    },
    {
      "Date": "8/26/2019",
      "Time": "7:31:00 AM",
      "Inbound Traffic Rate": 2.58729,
      "Outbound Traffic Rate": 970.52,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.266588015
    },
    {
      "Date": "8/26/2019",
      "Time": "7:36:00 AM",
      "Inbound Traffic Rate": 2.27966,
      "Outbound Traffic Rate": 947.096,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.240699992
    },
    {
      "Date": "8/26/2019",
      "Time": "7:41:00 AM",
      "Inbound Traffic Rate": 2.42746,
      "Outbound Traffic Rate": 947.009984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.256328871
    },
    {
      "Date": "8/26/2019",
      "Time": "7:46:00 AM",
      "Inbound Traffic Rate": 2.3001,
      "Outbound Traffic Rate": 953.057984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.241338936
    },
    {
      "Date": "8/26/2019",
      "Time": "7:51:00 AM",
      "Inbound Traffic Rate": 2.90076,
      "Outbound Traffic Rate": 1034.259968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.280467203
    },
    {
      "Date": "8/26/2019",
      "Time": "7:56:00 AM",
      "Inbound Traffic Rate": 2.58659,
      "Outbound Traffic Rate": 1064.860032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.242904224
    },
    {
      "Date": "8/26/2019",
      "Time": "8:01:00 AM",
      "Inbound Traffic Rate": 3.02533,
      "Outbound Traffic Rate": 1059.889984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.285438116
    },
    {
      "Date": "8/26/2019",
      "Time": "8:06:00 AM",
      "Inbound Traffic Rate": 3.32765,
      "Outbound Traffic Rate": 1131.539968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.294081526
    },
    {
      "Date": "8/26/2019",
      "Time": "8:11:00 AM",
      "Inbound Traffic Rate": 3.74367,
      "Outbound Traffic Rate": 1205.740032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.310487327
    },
    {
      "Date": "8/26/2019",
      "Time": "8:16:00 AM",
      "Inbound Traffic Rate": 3.76374,
      "Outbound Traffic Rate": 1139.289984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.330358386
    },
    {
      "Date": "8/26/2019",
      "Time": "8:21:00 AM",
      "Inbound Traffic Rate": 3.87484,
      "Outbound Traffic Rate": 1131.069952,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.342581818
    },
    {
      "Date": "8/26/2019",
      "Time": "8:26:00 AM",
      "Inbound Traffic Rate": 3.83577,
      "Outbound Traffic Rate": 1142.029952,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.335872977
    },
    {
      "Date": "8/26/2019",
      "Time": "8:31:00 AM",
      "Inbound Traffic Rate": 3.66655,
      "Outbound Traffic Rate": 1118.429952,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.327830097
    },
    {
      "Date": "8/26/2019",
      "Time": "8:36:00 AM",
      "Inbound Traffic Rate": 3.84107,
      "Outbound Traffic Rate": 1223.219968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.314013023
    },
    {
      "Date": "8/26/2019",
      "Time": "8:41:00 AM",
      "Inbound Traffic Rate": 3.94624,
      "Outbound Traffic Rate": 1255.510016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.314313701
    },
    {
      "Date": "8/26/2019",
      "Time": "8:46:00 AM",
      "Inbound Traffic Rate": 4.17624,
      "Outbound Traffic Rate": 1278.339968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.326692437
    },
    {
      "Date": "8/26/2019",
      "Time": "8:51:00 AM",
      "Inbound Traffic Rate": 4.76579,
      "Outbound Traffic Rate": 1312.710016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.363049717
    },
    {
      "Date": "8/26/2019",
      "Time": "8:56:00 AM",
      "Inbound Traffic Rate": 6.15006,
      "Outbound Traffic Rate": 1328.039936,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.463093001
    },
    {
      "Date": "8/26/2019",
      "Time": "9:01:00 AM",
      "Inbound Traffic Rate": 4.40111,
      "Outbound Traffic Rate": 1300.409984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.338440188
    },
    {
      "Date": "8/26/2019",
      "Time": "9:06:00 AM",
      "Inbound Traffic Rate": 4.2071,
      "Outbound Traffic Rate": 1314.429952,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.320070308
    },
    {
      "Date": "8/26/2019",
      "Time": "9:11:00 AM",
      "Inbound Traffic Rate": 4.56289,
      "Outbound Traffic Rate": 1333.379968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.342204781
    },
    {
      "Date": "8/26/2019",
      "Time": "9:16:00 AM",
      "Inbound Traffic Rate": 4.93868,
      "Outbound Traffic Rate": 1318.029952,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.374701652
    },
    {
      "Date": "8/26/2019",
      "Time": "9:21:00 AM",
      "Inbound Traffic Rate": 5.15235,
      "Outbound Traffic Rate": 1387.180032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.371426194
    },
    {
      "Date": "8/26/2019",
      "Time": "9:26:00 AM",
      "Inbound Traffic Rate": 5.98138,
      "Outbound Traffic Rate": 1394.96,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.428785055
    },
    {
      "Date": "8/26/2019",
      "Time": "9:31:00 AM",
      "Inbound Traffic Rate": 4.60557,
      "Outbound Traffic Rate": 1373.059968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.335423806
    },
    {
      "Date": "8/26/2019",
      "Time": "9:36:00 AM",
      "Inbound Traffic Rate": 4.92768,
      "Outbound Traffic Rate": 1378.860032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.357373474
    },
    {
      "Date": "8/26/2019",
      "Time": "9:41:00 AM",
      "Inbound Traffic Rate": 4.32848,
      "Outbound Traffic Rate": 1429.609984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.302773487
    },
    {
      "Date": "8/26/2019",
      "Time": "9:46:00 AM",
      "Inbound Traffic Rate": 4.0228,
      "Outbound Traffic Rate": 1447.010048,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.278007745
    },
    {
      "Date": "8/26/2019",
      "Time": "9:51:00 AM",
      "Inbound Traffic Rate": 4.09161,
      "Outbound Traffic Rate": 1486.32,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.275284596
    },
    {
      "Date": "8/26/2019",
      "Time": "9:56:00 AM",
      "Inbound Traffic Rate": 4.67239,
      "Outbound Traffic Rate": 1493.769984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.312791799
    },
    {
      "Date": "8/26/2019",
      "Time": "10:01:00 AM",
      "Inbound Traffic Rate": 4.39225,
      "Outbound Traffic Rate": 1447.740032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.303386651
    },
    {
      "Date": "8/26/2019",
      "Time": "10:06:00 AM",
      "Inbound Traffic Rate": 4.25332,
      "Outbound Traffic Rate": 1456.600064,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.292003283
    },
    {
      "Date": "8/26/2019",
      "Time": "10:11:00 AM",
      "Inbound Traffic Rate": 4.87961,
      "Outbound Traffic Rate": 1481.590016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.329349547
    },
    {
      "Date": "8/26/2019",
      "Time": "10:16:00 AM",
      "Inbound Traffic Rate": 5.37184,
      "Outbound Traffic Rate": 1534.380032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.350098404
    },
    {
      "Date": "8/26/2019",
      "Time": "10:21:00 AM",
      "Inbound Traffic Rate": 5.36916,
      "Outbound Traffic Rate": 1519.059968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.353452801
    },
    {
      "Date": "8/26/2019",
      "Time": "10:26:00 AM",
      "Inbound Traffic Rate": 5.75766,
      "Outbound Traffic Rate": 1491.580032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.386010799
    },
    {
      "Date": "8/26/2019",
      "Time": "10:31:00 AM",
      "Inbound Traffic Rate": 5.82151,
      "Outbound Traffic Rate": 1504.4,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.386965568
    },
    {
      "Date": "8/26/2019",
      "Time": "10:36:00 AM",
      "Inbound Traffic Rate": 5.45026,
      "Outbound Traffic Rate": 1463.12,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.372509432
    },
    {
      "Date": "8/26/2019",
      "Time": "10:41:00 AM",
      "Inbound Traffic Rate": 5.1106,
      "Outbound Traffic Rate": 1497.170048,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.341350671
    },
    {
      "Date": "8/26/2019",
      "Time": "10:46:00 AM",
      "Inbound Traffic Rate": 5.71379,
      "Outbound Traffic Rate": 1443.670016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.395782273
    },
    {
      "Date": "8/26/2019",
      "Time": "10:51:00 AM",
      "Inbound Traffic Rate": 5.54157,
      "Outbound Traffic Rate": 1503.699968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.36852897
    },
    {
      "Date": "8/26/2019",
      "Time": "10:56:00 AM",
      "Inbound Traffic Rate": 5.00349,
      "Outbound Traffic Rate": 1552.179968,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.32235244
    },
    {
      "Date": "8/26/2019",
      "Time": "11:01:00 AM",
      "Inbound Traffic Rate": 5.27106,
      "Outbound Traffic Rate": 1525.990016,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.345419036
    },
    {
      "Date": "8/26/2019",
      "Time": "11:06:00 AM",
      "Inbound Traffic Rate": 5.2921,
      "Outbound Traffic Rate": 1513.900032,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.349567335
    },
    {
      "Date": "8/26/2019",
      "Time": "11:11:00 AM",
      "Inbound Traffic Rate": 5.43619,
      "Outbound Traffic Rate": 1582.809984,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.343451839
    },
    {
      "Date": "8/26/2019",
      "Time": "11:16:00 AM",
      "Inbound Traffic Rate": 4.75628,
      "Outbound Traffic Rate": 1559.480064,
      "Day of Week": "Monday",
      "Traffic Ratio": 0.304991395
    }
  ];
let url = 'https://api.powerbi.com/beta/0ef43739-3ca7-44f8-aaa6-299f0227cb2d/datasets/a2b7dea2-a8cf-423e-903e-02ce0dfafa09/rows?key=Xz%2FTfpwP4mJcxXOP5dif6rEDf1fOUtPV5MKGI7LmHhBiMZqqXJrok0%2Fv2lnke1ylCAzA0gF9j%2BdrCNWbK2dCLw%3D%3D',
    index = 0;

const job = new CronJob('*/5 * * * * *', () => {
    let traffic_rate = traffic_rates[index];
    traffic_rate.Timestamp = new Date();
    delete traffic_rate.Date;
    delete traffic_rate.Time;
    console.log(traffic_rate)
    axios.post(url, [traffic_rate])
        .then(response => {
            console.log('index => ', index);
            index++;
            if (index === traffic_rates.length-1)
                index = 0;
        });
});

job.start();