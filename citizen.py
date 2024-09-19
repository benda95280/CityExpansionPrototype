import uuid
import random

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
        first_names = ['John', 'Jane', 'Mike', 'Emily', 'David', 'Sarah']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']
        genders = ['Male', 'Female']
        
        return cls(
            first_name=random.choice(first_names),
            last_name=random.choice(last_names),
            gender=random.choice(genders),
            age=random.randint(18, 80)
        )
