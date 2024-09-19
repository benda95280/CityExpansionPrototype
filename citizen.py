import uuid
import random
from faker import Faker

fake = Faker()

class Citizen:
    def __init__(self, first_name, last_name, gender, age):
        self.id = str(uuid.uuid4())
        self.first_name = first_name
        self.last_name = last_name
        self.gender = gender
        self.age = age

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'gender': self.gender,
            'age': self.age
        }

    @classmethod
    def from_dict(cls, data):
        citizen = cls(data['first_name'], data['last_name'], data['gender'], data['age'])
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
            age=random.randint(18, 80)
        )
