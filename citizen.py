import uuid

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
