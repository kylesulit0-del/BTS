export interface Member {
  id: string;
  stageName: string;
  realName: string;
  birthday: string;
  role: string;
  position: string;
  bio: string;
  funFacts: string[];
  soloProjects: string[];
  socialMedia: { platform: string; handle: string }[];
}

export const members: Member[] = [
  {
    id: "rm",
    stageName: "RM",
    realName: "Kim Namjoon",
    birthday: "September 12, 1994",
    role: "Leader, Main Rapper",
    position: "Leader",
    bio: "RM is the leader and main rapper of BTS. Known for his high IQ of 148 and fluent English, he is the primary songwriter and producer of the group. He learned English by watching Friends and has written and produced hundreds of songs.",
    funFacts: [
      "IQ of 148",
      "Learned English by watching Friends",
      "Loves visiting art museums",
      "Has a collection of figurines",
      "Scored in the top 1% on national exams"
    ],
    soloProjects: ["mono. (mixtape)", "Indigo (solo album)", "Right Place, Wrong Person"],
    socialMedia: [
      { platform: "Instagram", handle: "@rkive" }
    ]
  },
  {
    id: "jin",
    stageName: "Jin",
    realName: "Kim Seokjin",
    birthday: "December 4, 1992",
    role: "Vocalist, Visual",
    position: "Sub Vocalist, Visual",
    bio: "Jin is the eldest member of BTS, known as the group's visual and for his incredible vocal range. His warm personality and dad jokes have earned him the nickname 'Worldwide Handsome.' He studied acting at Konkuk University.",
    funFacts: [
      "Known as 'Worldwide Handsome'",
      "Famous for his dad jokes",
      "Excellent cook - loves making recipes",
      "Studied acting at Konkuk University",
      "Has pet sugar gliders named Odeng and Eomuk"
    ],
    soloProjects: ["The Astronaut (single)", "Running Wild"],
    socialMedia: [
      { platform: "Instagram", handle: "@jin" }
    ]
  },
  {
    id: "suga",
    stageName: "SUGA",
    realName: "Min Yoongi",
    birthday: "March 9, 1993",
    role: "Lead Rapper, Producer",
    position: "Lead Rapper",
    bio: "SUGA is a rapper, songwriter, and record producer. Also known by his solo alias Agust D, he is one of the most prolific producers in K-pop. Before BTS, he worked as an underground rapper in Daegu.",
    funFacts: [
      "Also known as Agust D",
      "Was an underground rapper before BTS",
      "Produces music for other artists too",
      "Loves basketball",
      "Known for his savage wit and dry humor"
    ],
    soloProjects: ["Agust D (mixtape)", "D-2 (mixtape)", "D-DAY (solo album)"],
    socialMedia: [
      { platform: "Instagram", handle: "@agustd" }
    ]
  },
  {
    id: "jhope",
    stageName: "j-hope",
    realName: "Jung Hoseok",
    birthday: "February 18, 1994",
    role: "Main Dancer, Sub Rapper",
    position: "Main Dancer",
    bio: "j-hope is the main dancer and sub rapper of BTS. Known as the group's sunshine and mood maker, he was a street dancer before joining BTS. His energy and positive attitude are infectious both on and off stage.",
    funFacts: [
      "Known as BTS's sunshine",
      "Won a national dance competition as a student",
      "His stage name represents hope",
      "Amazing street dancer before joining BTS",
      "Known for his iconic 'Hobi scream'"
    ],
    soloProjects: ["Hope World (mixtape)", "Jack In The Box (solo album)", "HOPE ON THE STREET"],
    socialMedia: [
      { platform: "Instagram", handle: "@uarmyhope" }
    ]
  },
  {
    id: "jimin",
    stageName: "Jimin",
    realName: "Park Jimin",
    birthday: "October 13, 1995",
    role: "Main Dancer, Lead Vocalist",
    position: "Main Dancer, Lead Vocalist",
    bio: "Jimin is a main dancer and lead vocalist known for his contemporary dance background, powerful stage presence, and emotive vocals. He studied contemporary dance at Busan High School of Arts before transferring to Korea Arts High School.",
    funFacts: [
      "Trained in contemporary dance",
      "Known for his incredible flexibility",
      "Has the most #1 hits as a K-pop soloist",
      "Famous for his eye smile",
      "Very caring and affectionate with members"
    ],
    soloProjects: ["FACE (solo album)", "MUSE (solo album)"],
    socialMedia: [
      { platform: "Instagram", handle: "@j.m" }
    ]
  },
  {
    id: "v",
    stageName: "V",
    realName: "Kim Taehyung",
    birthday: "December 30, 1995",
    role: "Vocalist, Visual",
    position: "Sub Vocalist, Visual",
    bio: "V is known for his deep, soulful baritone voice, acting talent, and unique artistic sensibility. He was a hidden member, revealed only at BTS's debut. His love for art, photography, and vintage aesthetics makes him a true creative soul.",
    funFacts: [
      "Has a unique deep baritone voice",
      "Was a 'hidden member' before debut",
      "Loves photography and art",
      "Acted in the K-drama Hwarang",
      "Known for his boxy smile"
    ],
    soloProjects: ["Layover (solo album)", "Winter Ahead (single)"],
    socialMedia: [
      { platform: "Instagram", handle: "@thv" }
    ]
  },
  {
    id: "jungkook",
    stageName: "Jungkook",
    realName: "Jeon Jungkook",
    birthday: "September 1, 1997",
    role: "Main Vocalist, Lead Dancer, Sub Rapper",
    position: "Main Vocalist, Center",
    bio: "Jungkook is the youngest member (maknae) of BTS and is often called the 'Golden Maknae' for his exceptional talent in singing, dancing, and virtually everything he tries. He joined BTS at just 15 years old.",
    funFacts: [
      "Known as the 'Golden Maknae'",
      "Joined BTS at age 15",
      "Good at almost every sport he tries",
      "Loves drawing and is very artistic",
      "His cover songs regularly break streaming records"
    ],
    soloProjects: ["GOLDEN (solo album)", "Standing Next to You (single)"],
    socialMedia: [
      { platform: "Instagram", handle: "@jungkook.97" }
    ]
  }
];
