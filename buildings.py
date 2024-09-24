import json
from flask_socketio import emit
from datetime import datetime, timedelta
from building import Building

# Load building data
with open('static/data/buildings.json', 'r') as f:
    buildings_data = json.load(f)

def find_available_building(game_state):
    for coords, building in game_state['grid'].items():
        if building.is_built:
            for accommodation in building.accommodations:
                if len(accommodation) < buildings_data[building.type]['max_people_per_accommodation']:
                    return coords
    return None

def handle_place_building(data, game_state, socketio):
    x, y = data['x'], data['y']
    building_type = data['building_type']
    
    if game_state['money'] >= buildings_data[building_type]['price']:
        construction_time = timedelta(minutes=buildings_data[building_type]['construction_time'])
        current_date = game_state['current_date']
        new_building = Building(
            building_type,
            1,
            x,
            y,
            current_date,
            current_date + construction_time
        )
        new_building.total_accommodations = buildings_data[building_type]['accommodations']
        new_building.accommodations = [[] for _ in range(new_building.total_accommodations)]
        
        game_state['grid'][f"{x},{y}"] = new_building
        game_state['money'] -= buildings_data[building_type]['price']
        game_state['total_accommodations'] += new_building.total_accommodations
        
        socketio.emit('building_placed', {'x': x, 'y': y, 'type': building_type})

def handle_upgrade_building(data, game_state, socketio):
    x, y = data['x'], data['y']
    building = game_state['grid'].get(f"{x},{y}")
    
    if building and building.is_built:
        building_type = building.type
        next_level = building.level + 1
        upgrade_cost = buildings_data[building_type]['upgrade_cost'] * next_level
        
        if game_state['money'] >= upgrade_cost:
            upgrade_time = buildings_data[building_type]['upgrade_time']
            new_accommodations = buildings_data[building_type]['accommodations']
            
            building.upgrade(upgrade_time, new_accommodations)
            game_state['total_accommodations'] += new_accommodations
            game_state['money'] -= upgrade_cost
            
            socketio.emit('building_upgraded', {'x': x, 'y': y, 'level': next_level})

def update_buildings(game_state, socketio):
    current_date = game_state['current_date']
    for coords, building in game_state['grid'].items():
        building.update_construction(current_date)
        
        if building.construction_progress == 1 and not building.is_built:
            building.is_built = True
            x, y = map(int, coords.split(','))
            socketio.emit('building_completed', {'x': x, 'y': y})

def update_city_finances(game_state):
    # This function is now empty as we've removed income calculations
    pass
