// DTO: Data Transfer Object para crear una categoría  
// Sirve como un filtro y una estructura para los datos entrantes al crear una nueva categoría

import { IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() //La decoración @IsString() asegura que el campo 'name' sea una cadena de texto
  @MinLength(2) //La decoración @MinLength(2) asegura que el nombre tenga al menos 2 caracteres
  name: string; // Nombre de la categoría
}
