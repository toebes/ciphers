# -*- coding: utf-8 -*-
from bs4 import BeautifulSoup
import requests
import os
from random import choice
from datetime import datetime

url = "https://proverbia.net/"
now = datetime.now()

def Buscar_Filosofo(filo):
    '''Permite buscar por nombre de filósofo y mostrar sus frases más famosas.'''
          
    page = requests.get(f'{url}buscar?t={filo}')  
    soup = BeautifulSoup(page.content, 'html.parser')    
    comprobar = soup.find_all('p')
    autores = soup.select('footer > a')
               
    if len(comprobar) == 0:
        print("No hay más resultados sobre este autor.")
        os._exit(1)
    
    contador = 1
    i=0
    for frase in soup.find_all('p'):
        print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
        contador += 1
        i+=1
            
    res = int(input('''\n¿Quieres seguir con este filósofo?
        1) Si.
        2) No. '''))
    num = 2
    while res == 1:
        page = requests.get(f'{url}buscar/{num}?t={filo}')
        soup = BeautifulSoup(page.content, 'html.parser')
        comprobar = soup.find_all('p')
        autores = soup.select('footer > a')
        
        if len(comprobar) == 0:
            print("No hay más resultados sobre este autor.")
            break
        
        print(f"Página {num}")
        contador = 1
        i=0
        for frase in soup.find_all('p'):
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        num += 1   
        res = int(input('''\n¿Quieres seguir con este filósofo?
        1) Si.
        2) No. '''))
        
def Frase_del_Dia():
    '''Muestra la frase del día de la página principal.
        Adicionalmente nos permite buscar más frases sobre
        el mismo autor.'''
    
    page = requests.get(url)       
    soup = BeautifulSoup(page.content, 'html.parser')
    
    frase = soup.p
    autor = soup.footer.a
    print(f'Frase del día: "{frase.get_text()}"\nAutor/a:{autor.get_text()}')
    rep = f'{frase.get_text()} - {autor.get_text()} - {now.date()}'
   
    
    
    
    print(f'''¿Deseas ver más frases sobre {autor.get_text()}?
        1) Si.
        2) No.''')
    saber = int(input())
    
    num = 1
    while saber == 1:
        
        page = requests.get(f"{url}buscar/{num}?t={autor.get_text()}")       
        soup = BeautifulSoup(page.content, 'html.parser')
        comprobar = soup.find_all('p')
        
        
        if len(comprobar) == 0:
            print("No hay más resultados sobre este autor.")
            break
        
        print(f"Página {num}")
        contador = 1

        for frase in soup.find_all('p'):
            print(f'[{contador}] {frase.get_text()}')
            contador += 1
            
        num += 1   
        saber = int(input('''\n¿Quieres seguir con este filósofo?
        1) Si.
        2) No. '''))
        
    
def Frases_Tematicas():
    '''Permite elegir frases por temáticas.'''
    
    print("")
    page = requests.get('https://proverbia.net/tematica/index')
    soup = BeautifulSoup(page.content, 'html.parser')
    
    contador = 1
    for frase in soup.find_all('h2', class_="my-1"):
        print(f"{contador}){frase.get_text()}")
        contador+=1

    print("")
    tem = int(input('''¿Sobre qué temática deseas buscar? 
    -> '''))

    if tem == 1:
        tema = soup.find_all('h2', class_="my-1")[0].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        comprobar = soup.find_all('p')[1:]
        
        if len(comprobar) == 0:
            print("No hay más resultados sobre este autor.")
            os._exit(1)
            
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i += 1
            
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            
            comprobar = soup.find_all('p')[1:]
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i += 1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
            
    elif tem == 2:
        tema = soup.find_all('h2', class_="my-1")[1].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            
            comprobar = soup.find_all('p')[1:]
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
                
            autores = soup.select('footer > a')
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 3:
        tema = soup.find_all('h2', class_="my-1")[2].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
            
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
                
            autores = soup.select('footer > a')
        
            print(f"Página {num}")
            contador = 1
            i = 0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 4:
        tema = soup.find_all('h2', class_="my-1")[3].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
            
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
            
            autores = soup.select('footer > a')
            
            if len(comprobar) == 0:
                print("Error. No hay resultados sobre esta búsqueda.")
                os._exit(1)
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 5:
        tema = soup.find_all('h2', class_="my-1")[4].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[2:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
            
            autores = soup.select('footer > a')
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[2:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 6:
        tema = soup.find_all('h2', class_="my-1")[5].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            autores = soup.select('footer > a')
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 7:
        
        tematica = 'frases-de-pensamiento-y-razon'
        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print("\nFrases de Pensamiento y Razón: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
            
            autores = soup.select('footer > a')
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 8:
        tema = soup.find_all('h2', class_="my-1")[7].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            autores = soup.select('footer > a')
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 9:
        tema = soup.find_all('h2', class_="my-1")[8].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
               
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            autores = soup.select('footer > a')
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
                 
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    elif tem == 10:
        tema = soup.find_all('h2', class_="my-1")[9].get_text().lower().strip()
        tematica = f'frases-de-{tema}'

        page = requests.get(f'{url}{tematica}')
        soup = BeautifulSoup(page.content, 'html.parser')
        
        autores = soup.select('footer > a')
        
        print(f"\nFrases de {tema.capitalize()}: ")
        contador = 1
        i=0
        for frase in soup.find_all('p')[1:]:
            print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        
        res = int(input('''\n¿Quieres seguir con esta temática?
        1) Si.
        2) No. 
        -> '''))
        num = 2
        while res == 1:
            page = requests.get(f'{url}{tematica}/{num}')
            soup = BeautifulSoup(page.content, 'html.parser')
            comprobar = soup.find_all('p')[1:]
            
            autores = soup.select('footer > a')
            
            if len(comprobar) == 0:
                print("No hay más resultados sobre este autor.")
                os._exit(1)
        
            print(f"Página {num}")
            contador = 1
            i=0
            for frase in soup.find_all('p')[1:]:
                print(f'[{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
                contador += 1
                i+=1
            num += 1   
            res = int(input('''\n¿Quieres seguir con esta temática?
                1) Si.
                2) No. 
                -> '''))
    else:
        print("Saliendo...")
            
def Refranes():
    '''Muestra los refranes.'''
    
    page = requests.get(f'{url}refranes')
    soup = BeautifulSoup(page.content, 'html.parser')
    comprobar = soup.find_all('p')
        
    if len(comprobar) == 0:
        print("No hay más resultados sobre este autor.")
        os._exit(1)
         
    contador = 1
    for frase in soup.find_all('p'):
        print([contador] , frase.get_text())
        contador += 1
        
    res = int(input('''\n¿Quieres seguir viendo más refranes?
        1) Si.
        2) No. 
        -> '''))
    num = 2
    while res == 1:
        page = requests.get(f'{url}refranes/{num}')
        soup = BeautifulSoup(page.content, 'html.parser')
        comprobar = soup.find_all('p')
        
        if len(comprobar) == 0:
            print("No hay más resultados sobre este autor.")
            break
        
        print(f"Página {num}")
        contador = 1
        for frase in soup.find_all('p'):
            print([contador] , frase.get_text())
            contador += 1
        num += 1   
        res = int(input('''\n¿Quieres seguir viendo más refranes?
            1) Si.
            2) No. 
            -> '''))
        
def Autor_Destacado():
    '''Muestra el autor destacado actualmente.'''
       
    page = requests.get(f'{url}')       
    soup = BeautifulSoup(page.content, 'html.parser')
    autor = soup.find('h5', class_="card-title")
    print(f"\nEl autor destacado es: {autor.get_text()}")
    page = requests.get(f'{url}buscar?t={autor}')       
    soup = BeautifulSoup(page.content, 'html.parser')
    autores = soup.select('footer > a')
    

    print("\nSus citas más célebres son: ") 
    contador = 1
    i=0
    for frase in soup.find_all('p'):
        print(f' [{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
        contador += 1
        i+=1
           
    res = int(input('''\n¿Quieres seguir con este filósofo?
        1) Si.
        2) No. 
        -> '''))
    num = 2
    while res == 1:
        
        page = requests.get(f'{url}buscar/{num}?t={autor}')
        soup = BeautifulSoup(page.content, 'html.parser')
        comprobar = soup.find_all('p')
        autores = soup.select('footer > a')
        
        if len(comprobar) == 0:
            print("No hay más resultados sobre este autor.")
            break
        
        print(f"Página {num}")
        contador = 1
        i=0
        for frase in soup.find_all('p'):
            print(f' [{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        num += 1   
        res = int(input('''\n¿Quieres seguir con este filósofo?
        1) Si.
        2) No. 
        -> '''))
        
def Seleccion_Semanal():
    '''Muestra la selección semanal de frases.'''
    
    print("Selección semanal: ")
    page = requests.get('https://proverbia.net/')
    soup = BeautifulSoup(page.content, 'html.parser')
    
    autores = soup.select('footer > a')[1:]
        
    contador = 1
    i = 0
    for frase in soup.find_all('p')[2:9]:
        print(f" [{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}")
        contador+=1
        i+=1
        
def Autor_Aleatorio():
    '''Elige un autor al azar y muestra sus frases más célebres.'''
    
    autores = ['Platón', 'Aristóteles', 'Asimov',
        'Heráclito', 'Demócrito', 'Sócrates',
        'Pitágoras', 'Epicuro', 'Averroes',
        'Descartes', 'Locke', 'Oscar Wilde',
        'Kant', 'Hegel', 'Karl Marx',
        'Tolkien', 'Nietzsche', 'Cervantes',
        'Nicolás Maquiavelo', 'Confucio', 'Comte'
        ]
    
    aleatorio = choice(autores)
    print(f'El autor elegido es: {aleatorio}')
    
    page = requests.get(f'{url}buscar?t={aleatorio}')       
    soup = BeautifulSoup(page.content, 'html.parser')    
    comprobar = soup.find_all('p')
    autores = soup.select('footer > a')
    
    if len(comprobar) == 0:
        print("No hay más resultados sobre este autor.")
        os._exit(1)
    
    contador = 1
    i=0
    for frase in soup.find_all('p'):
        print(f' [{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
        contador += 1
        i+=1
        
    res = int(input('''\n¿Quieres seguir con este filósofo?
        1) Si.
        2) No. 
        -> '''))
    num = 2
    while res == 1:
        
        page = requests.get(f'{url}buscar/{num}?t={aleatorio}')
        soup = BeautifulSoup(page.content, 'html.parser')
        comprobar = soup.find_all('p')
        autores = soup.select('footer > a')
        
        if len(comprobar) == 0:
            print("No hay más resultados sobre este autor.")
            break
        
        print(f"Página {num}")
        contador = 1
        i=0
        for frase in soup.find_all('p'):
            print(f' [{contador}] {frase.get_text()} -> {autores[i].get_text().strip()}')
            contador += 1
            i+=1
        num += 1   
        res = int(input('''\n¿Quieres seguir con este filósofo?
        1) Si.
        2) No. 
        -> '''))
    

eleccion = int(input('''¿Qué deseas hacer?
    1) Buscar filósofo. 
    2) Frase del día. 
    3) Frases por temática. 
    4) Refranes. 
    5) Autor Destacado.
    6) Selección semanal.
    7) Autor aleatorio.
    -> '''))

if eleccion == 1:
    filo = input("Introduce el nombre del filósofo que deseas buscar: ")
    Buscar_Filosofo(filo)
elif eleccion == 2:
    Frase_del_Dia()
elif eleccion == 3:
    Frases_Tematicas()
elif eleccion == 4:
    Refranes()
elif eleccion == 5:
    Autor_Destacado()
elif eleccion == 6:
    Seleccion_Semanal()
elif eleccion == 7:
    Autor_Aleatorio()
else:
    print("Saliendo...")