import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatCard, MatCardActions, MatCardContent, MatCardHeader } from "@angular/material/card";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-not-found",
  standalone: true,
  imports: [MatCard, MatCardHeader, MatCardContent, MatCardActions, RouterLink],
  templateUrl: "./not-found.component.html",
  styleUrl: "./not-found.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
