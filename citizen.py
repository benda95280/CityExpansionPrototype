import uuid
import random
from faker import Faker
from datetime import datetime

fake = Faker()

MUSIC_GENRES = [
    "Rock", "Pop", "Hip Hop", "Jazz", "Classical", "Electronic", "Country",
    "R&B", "Blues", "Reggae", "Folk", "Metal", "Punk", "Soul", "Funk"
]

class Citizen:
    def __init__(self, first_name, last_name, gender, birthday, previous_job, favorite_music):
        self.id = str(uuid.uuid4())
        self.first_name = first_name
        self.last_name = last_name
        self.gender = gender
        self.birthday = birthday
        self.previous_job = previous_job
        self.favorite_music = favorite_music

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'gender': self.gender,
            'birthday': self.birthday.isoformat(),
            'previous_job': self.previous_job,
            'favorite_music': self.favorite_music
        }

    @classmethod
    def from_dict(cls, data):
        citizen = cls(
            data['first_name'],
            data['last_name'],
            data['gender'],
            datetime.fromisoformat(data['birthday']),
            data['previous_job'],
            data['favorite_music']
        )
        citizen.id = data['id']
        return citizen

    @classmethod
    def generate_random_citizen(cls):
        gender = random.choice(['Male', 'Female'])
        if gender == 'Male':
            first_name = fake.first_name_male()
        else:
            first_name = fake.first_name_female()
        
        return cls(
            first_name=first_name,
            last_name=fake.last_name(),
            gender=gender,
            birthday=fake.date_of_birth(minimum_age=18, maximum_age=120),
            previous_job=fake.job(),
            favorite_music=random.choice(MUSIC_GENRES)
        )
